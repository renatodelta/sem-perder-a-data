/**
 * functions/api.js - Cloudflare Pages Function integrado ao Cloudflare D1
 * Roda na borda da Cloudflare e responde em /api?action=...
 */

// Helper para converter base64 URL-safe para ArrayBuffer
function base64UrlToUint8Array(base64UrlString) {
  const padding = '='.repeat((4 - (base64UrlString.length % 4)) % 4);
  const base64 = (base64UrlString + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    buffer[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Cria o cabeçalho Authorization VAPID compatível com Google FCM e Apple APNs
async function generateVapidHeader(endpointUrl, vapidPrivateKey, vapidPublicKey, subject = 'mailto:admin@semperderadata.local') {
  const origin = new URL(endpointUrl).origin;
  const header = { typ: 'JWT', alg: 'ES256' };
  const exp = Math.floor(Date.now() / 1000) + (12 * 60 * 60); // 12 horas de validade
  const payload = {
    aud: origin,
    exp: exp,
    sub: subject
  };

  const encHeader = arrayBufferToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const encPayload = arrayBufferToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${encHeader}.${encPayload}`;

  // Importa a chave privada VAPID (formato JWK P-256)
  const dBytes = base64UrlToUint8Array(vapidPrivateKey);
  const rawPub = base64UrlToUint8Array(vapidPublicKey);
  // Remove o byte 0x04 inicial de ponto não comprimido para pegar x e y (32 bytes cada)
  const xBytes = rawPub.slice(1, 33);
  const yBytes = rawPub.slice(33, 65);

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: arrayBufferToBase64Url(xBytes),
    y: arrayBufferToBase64Url(yBytes),
    d: arrayBufferToBase64Url(dBytes),
    ext: true
  };

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const encSignature = arrayBufferToBase64Url(signature);
  const jwt = `${unsignedToken}.${encSignature}`;

  return `vapid t=${jwt}, k=${vapidPublicKey}`;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || '';
  const db = env.DB; // Binding do Cloudflare D1

  // Headers de resposta JSON com CORS
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Se o binding D1 não estiver configurado, retorna aviso amigável
  if (!db) {
    return new Response(JSON.stringify({
      error: 'Cloudflare D1 não configurado no painel da Cloudflare. Conecte a variável DB nas configurações do Pages.'
    }), { status: 500, headers });
  }

  let input = {};
  if (request.method === 'POST') {
    try {
      input = await request.json();
    } catch (e) {
      input = {};
    }
  }

  try {
    switch (action) {
      // 1. OBTER TODOS OS DADOS
      case 'get_all_data': {
        const personsRes = await db.prepare(
          "SELECT * FROM persons ORDER BY CASE WHEN name = 'Ednéia' THEN 0 ELSE 1 END, name ASC"
        ).all();
        const persons = personsRes.results || [];

        const appRes = await db.prepare(`
          SELECT a.*, p.name as person_name, p.relation as person_relation, p.color as person_color,
                 (SELECT COUNT(*) FROM exams e WHERE e.target_appointment_id = a.id) as exams_to_bring_count
          FROM appointments a
          JOIN persons p ON a.person_id = p.id
          ORDER BY a.appointment_date ASC, a.appointment_time ASC
        `).all();
        const appointments = appRes.results || [];

        const examRes = await db.prepare(`
          SELECT e.*, p.name as person_name, p.relation as person_relation, p.color as person_color,
                 target_app.appointment_date as target_appointment_date,
                 target_app.doctor_name as target_doctor_name,
                 target_app.specialty as target_specialty,
                 target_app.city as target_city
          FROM exams e
          JOIN persons p ON e.person_id = p.id
          LEFT JOIN appointments target_app ON e.target_appointment_id = target_app.id
          ORDER BY 
            CASE 
              WHEN e.status = 'pronto_levar' THEN 0
              WHEN e.status = 'a_agendar' THEN 1
              WHEN e.status = 'agendado' THEN 2
              WHEN e.status = 'feito_aguardando' THEN 3
              ELSE 4 
            END,
            e.exam_date ASC
        `).all();
        const exams = examRes.results || [];

        const medRes = await db.prepare(`
          SELECT m.*, p.name as person_name, p.relation as person_relation, p.color as person_color
          FROM medications m
          JOIN persons p ON m.person_id = p.id
          ORDER BY m.needs_purchase DESC, p.name ASC, m.name ASC
        `).all();
        const medications = medRes.results || [];

        // Cálculo de Logística e Viagens Compartilhadas
        const logisticsEvents = {};

        appointments.forEach(a => {
          if (a.status !== 'cancelada' && a.appointment_date && a.city) {
            const key = a.appointment_date.trim() + '___' + a.city.trim().toLowerCase();
            if (!logisticsEvents[key]) logisticsEvents[key] = [];
            logisticsEvents[key].push({
              type: 'consulta',
              id: a.id,
              date: a.appointment_date,
              time: a.appointment_time || 'Sem hora',
              city: a.city.trim(),
              person_id: a.person_id,
              person_name: a.person_name,
              person_color: a.person_color,
              title: `Consulta: ${a.specialty}${a.doctor_name ? ' (' + a.doctor_name + ')' : ''}`,
              location: a.location_name || 'Local a confirmar',
              exams_to_bring: a.exams_to_bring_count
            });
          }
        });

        exams.forEach(e => {
          if (e.status === 'agendado' && e.exam_date && e.city) {
            const key = e.exam_date.trim() + '___' + e.city.trim().toLowerCase();
            if (!logisticsEvents[key]) logisticsEvents[key] = [];
            logisticsEvents[key].push({
              type: 'exame',
              id: e.id,
              date: e.exam_date,
              time: e.exam_time || 'Sem hora',
              city: e.city.trim(),
              person_id: e.person_id,
              person_name: e.person_name,
              person_color: e.person_color,
              title: `Exame: ${e.exam_name}`,
              location: e.location_name || 'Laboratório',
              exams_to_bring: 0
            });
          }
        });

        const trips = [];
        Object.keys(logisticsEvents).forEach(key => {
          const events = logisticsEvents[key];
          const uniquePersons = {};
          events.forEach(ev => {
            uniquePersons[ev.person_id] = { id: ev.person_id, name: ev.person_name, color: ev.person_color };
          });

          const sampleDate = events[0].date;
          const city = events[0].city;
          const medsToBuy = medications.filter(m => {
            if (m.needs_purchase == 1) {
              const pref = (m.preferred_city || '').trim().toLowerCase();
              return !pref || pref === city.toLowerCase();
            }
            return false;
          });

          trips.push({
            date: sampleDate,
            city: city,
            total_events: events.length,
            total_people: Object.keys(uniquePersons).length,
            people: Object.values(uniquePersons),
            events: events,
            is_shared_ride: Object.keys(uniquePersons).length > 1,
            meds_to_buy: medsToBuy
          });
        });

        trips.sort((a, b) => a.date.localeCompare(b.date));

        const today = new Date().toISOString().split('T')[0];
        const summary = {
          today_appointments: appointments.filter(a => a.status === 'agendada' && a.appointment_date === today).length,
          week_appointments: appointments.filter(a => a.status === 'agendada' && a.appointment_date >= today).length,
          exams_to_schedule: exams.filter(e => e.status === 'a_agendar').length,
          exams_ready_to_bring: exams.filter(e => e.status === 'pronto_levar').length,
          meds_to_buy: medications.filter(m => m.needs_purchase == 1).length,
          shared_trips_count: trips.filter(t => t.date >= today && t.is_shared_ride).length
        };

        return new Response(JSON.stringify({
          success: true,
          persons,
          appointments,
          exams,
          medications,
          trips,
          summary,
          current_date: today
        }), { headers });
      }

      // 2. SALVAR CONSULTA
      case 'save_appointment': {
        const id = input.id ? parseInt(input.id, 10) : null;
        const person_id = parseInt(input.person_id, 10);
        const doctor_name = (input.doctor_name || '').trim();
        const specialty = (input.specialty || '').trim();
        const location_name = (input.location_name || '').trim();
        const city = (input.city || '').trim();
        const appointment_date = (input.appointment_date || '').trim();
        const appointment_time = (input.appointment_time || '').trim() || null;
        const status = (input.status || 'agendada').trim();
        const notes = (input.notes || '').trim();

        if (!person_id || !specialty || !city || !appointment_date) {
          return new Response(JSON.stringify({ error: 'Campos obrigatórios faltando.' }), { status: 400, headers });
        }

        if (id) {
          await db.prepare(`
            UPDATE appointments 
            SET person_id = ?, doctor_name = ?, specialty = ?, location_name = ?, city = ?, 
                appointment_date = ?, appointment_time = ?, status = ?, notes = ?
            WHERE id = ?
          `).bind(person_id, doctor_name, specialty, location_name, city, appointment_date, appointment_time, status, notes, id).run();
        } else {
          await db.prepare(`
            INSERT INTO appointments (person_id, doctor_name, specialty, location_name, city, appointment_date, appointment_time, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(person_id, doctor_name, specialty, location_name, city, appointment_date, appointment_time, status, notes).run();
        }

        return new Response(JSON.stringify({ success: true }), { headers });
      }

      case 'delete_appointment': {
        const id = parseInt(input.id, 10);
        await db.prepare('DELETE FROM appointments WHERE id = ?').bind(id).run();
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      case 'update_appointment_status': {
        const id = parseInt(input.id, 10);
        const status = (input.status || 'agendada').trim();
        await db.prepare('UPDATE appointments SET status = ? WHERE id = ?').bind(status, id).run();
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // 3. SALVAR EXAME
      case 'save_exam': {
        const id = input.id ? parseInt(input.id, 10) : null;
        const person_id = parseInt(input.person_id, 10);
        const exam_name = (input.exam_name || '').trim();
        const target_appointment_id = input.target_appointment_id ? parseInt(input.target_appointment_id, 10) : null;
        const exam_date = (input.exam_date || '').trim() || null;
        const exam_time = (input.exam_time || '').trim() || null;
        const location_name = (input.location_name || '').trim();
        const city = (input.city || '').trim();
        const status = (input.status || 'a_agendar').trim();
        const result_notes = (input.result_notes || '').trim();

        if (!person_id || !exam_name) {
          return new Response(JSON.stringify({ error: 'Pessoa e nome do exame são obrigatórios.' }), { status: 400, headers });
        }

        if (id) {
          await db.prepare(`
            UPDATE exams 
            SET person_id = ?, exam_name = ?, target_appointment_id = ?, 
                exam_date = ?, exam_time = ?, location_name = ?, city = ?, status = ?, result_notes = ?
            WHERE id = ?
          `).bind(person_id, exam_name, target_appointment_id, exam_date, exam_time, location_name, city, status, result_notes, id).run();
        } else {
          await db.prepare(`
            INSERT INTO exams (person_id, exam_name, target_appointment_id, exam_date, exam_time, location_name, city, status, result_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(person_id, exam_name, target_appointment_id, exam_date, exam_time, location_name, city, status, result_notes).run();
        }

        return new Response(JSON.stringify({ success: true }), { headers });
      }

      case 'update_exam_status': {
        const id = parseInt(input.id, 10);
        const status = (input.status || 'a_agendar').trim();
        await db.prepare('UPDATE exams SET status = ? WHERE id = ?').bind(status, id).run();
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      case 'delete_exam': {
        const id = parseInt(input.id, 10);
        await db.prepare('DELETE FROM exams WHERE id = ?').bind(id).run();
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // 4. SALVAR REMÉDIO
      case 'save_medication': {
        const id = input.id ? parseInt(input.id, 10) : null;
        const person_id = parseInt(input.person_id, 10);
        const name = (input.name || '').trim();
        const dosage = (input.dosage || '').trim();
        const instructions = (input.instructions || '').trim();
        const preferred_city = (input.preferred_city || '').trim();
        const needs_purchase = input.needs_purchase ? 1 : 0;
        const notes = (input.notes || '').trim();

        if (!person_id || !name) {
          return new Response(JSON.stringify({ error: 'Pessoa e nome do remédio são obrigatórios.' }), { status: 400, headers });
        }

        if (id) {
          await db.prepare(`
            UPDATE medications 
            SET person_id = ?, name = ?, dosage = ?, instructions = ?, 
                needs_purchase = ?, preferred_city = ?, notes = ?
            WHERE id = ?
          `).bind(person_id, name, dosage, instructions, needs_purchase, preferred_city, notes, id).run();
        } else {
          await db.prepare(`
            INSERT INTO medications (person_id, name, dosage, instructions, needs_purchase, preferred_city, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(person_id, name, dosage, instructions, needs_purchase, preferred_city, notes).run();
        }

        return new Response(JSON.stringify({ success: true }), { headers });
      }

      case 'toggle_medication_purchase': {
        const id = parseInt(input.id, 10);
        const needs = input.needs_purchase ? 1 : 0;
        await db.prepare('UPDATE medications SET needs_purchase = ? WHERE id = ?').bind(needs, id).run();
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      case 'delete_medication': {
        const id = parseInt(input.id, 10);
        await db.prepare('DELETE FROM medications WHERE id = ?').bind(id).run();
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // 5. SALVAR FAMILIAR
      case 'save_person': {
        const id = input.id ? parseInt(input.id, 10) : null;
        const name = (input.name || '').trim();
        const relation = (input.relation || '').trim();
        const color = (input.color || '#3b82f6').trim();
        const notes = (input.notes || '').trim();

        if (!name) {
          return new Response(JSON.stringify({ error: 'Nome é obrigatório.' }), { status: 400, headers });
        }

        if (id) {
          await db.prepare('UPDATE persons SET name = ?, relation = ?, color = ?, notes = ? WHERE id = ?')
            .bind(name, relation, color, notes, id).run();
        } else {
          await db.prepare('INSERT INTO persons (name, relation, color, notes) VALUES (?, ?, ?, ?)')
            .bind(name, relation, color, notes).run();
        }

        return new Response(JSON.stringify({ success: true }), { headers });
      }

      case 'delete_person': {
        const id = parseInt(input.id, 10);
        await db.prepare('DELETE FROM persons WHERE id = ?').bind(id).run();
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // 6. NOTIFICAÇÕES PUSH (VAPID / DISPOSITIVOS)
      case 'get_vapid_public_key': {
        const publicKey = env.VAPID_PUBLIC_KEY || 'BHLVYyEtgS03hBshXPDbjgNtYZ6kQzydxFtSxC0W_A-roF5Ypj8lnoV9KbH_dPoDa5tLob5NUs1KmELCav37_40';
        return new Response(JSON.stringify({ success: true, publicKey }), { headers });
      }

      case 'save_push_subscription': {
        const endpoint = input.endpoint || '';
        const p256dh = input.keys?.p256dh || '';
        const auth = input.keys?.auth || '';
        const userAgent = request.headers.get('user-agent') || '';

        if (!endpoint || !p256dh || !auth) {
          return new Response(JSON.stringify({ error: 'Dados da inscrição inválidos' }), { status: 400, headers });
        }

        // Garante que a tabela existe
        await db.prepare(`
          CREATE TABLE IF NOT EXISTS push_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            endpoint TEXT NOT NULL UNIQUE,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            user_agent TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run();

        // Insere ou atualiza o aparelho
        await db.prepare(`
          INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_agent, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(endpoint) DO UPDATE SET
            p256dh = excluded.p256dh,
            auth = excluded.auth,
            user_agent = excluded.user_agent,
            updated_at = CURRENT_TIMESTAMP
        `).bind(endpoint, p256dh, auth, userAgent).run();

        return new Response(JSON.stringify({ success: true, message: 'Aparelho registrado no Cloudflare D1 com sucesso!' }), { headers });
      }

      case 'get_push_subscribers_count': {
        try {
          const countRes = await db.prepare("SELECT count(*) as total FROM push_subscriptions").first();
          return new Response(JSON.stringify({ success: true, total: countRes ? countRes.total : 0 }), { headers });
        } catch (e) {
          return new Response(JSON.stringify({ success: true, total: 0 }), { headers });
        }
      }

      // DISPARO DE TESTE WEB PUSH PELO CLOUDFLARE
      case 'send_test_push': {
        const subsRes = await db.prepare("SELECT * FROM push_subscriptions ORDER BY id DESC").all();
        const subscriptions = subsRes.results || [];

        if (subscriptions.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Nenhum aparelho cadastrado no Cloudflare D1.'
          }), { headers });
        }

        const results = [];
        const payloadText = JSON.stringify({
          title: '🔔 Alerta: App Fechado!',
          body: '🎉 Parabéns! Notificação enviada pelo Cloudflare diretamente para o seu celular.',
          icon: 'assets/icons/icon-192.png',
          badge: 'assets/icons/icon-192.png',
          data: { url: './' }
        });

        // Chaves VAPID configuradas
        const vapidPublicKey = env.VAPID_PUBLIC_KEY || 'BHLVYyEtgS03hBshXPDbjgNtYZ6kQzydxFtSxC0W_A-roF5Ypj8lnoV9KbH_dPoDa5tLob5NUs1KmELCav37_40';
        const vapidPrivateKey = env.VAPID_PRIVATE_KEY || 'zEBJsmnvBCDtlFuQ3yzbnNP6Az9Gz-YxVJPnU_SqXoc';

        for (const sub of subscriptions) {
          try {
            // Gera o cabeçalho Authorization VAPID assinado (RFC 8292)
            const authHeader = await generateVapidHeader(sub.endpoint, vapidPrivateKey, vapidPublicKey);

            // Disparo oficial WebPush para o Google FCM / Apple APNs
            const pushRes = await fetch(sub.endpoint, {
              method: 'POST',
              headers: {
                'Authorization': authHeader,
                'TTL': '86400',
                'Urgency': 'high'
              }
            });

            results.push({
              id: sub.id,
              status: pushRes.status,
              ok: pushRes.status === 201 || pushRes.status === 200 || pushRes.status === 202
            });

            // Se o aparelho foi cancelado ou expirou no Google/Apple (410 Gone ou 404)
            if (pushRes.status === 410 || pushRes.status === 404) {
              await db.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(sub.id).run();
            }
          } catch (err) {
            results.push({ id: sub.id, error: err.message });
          }
        }

        return new Response(JSON.stringify({
          success: true,
          total_subscribers: subscriptions.length,
          detalhes: results
        }), { headers });
      }

      default:
        return new Response(JSON.stringify({ error: 'Ação não reconhecida' }), { status: 400, headers });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
