/**
 * Família em Dia - JavaScript da Aplicação
 * Gestão de Saúde, Exames, Remédios e Viagens Regionais da Ednéia
 */

let deferredInstallPrompt = null;

const App = {
  apiEndpoint: 'api',
  useLocalDB: false,
  state: {
    persons: [],
    appointments: [],
    exams: [],
    medications: [],
    trips: [],
    summary: {},
    currentTab: 'consultas',
    selectedWeekFilter: 'esta_semana',
    selectedFamilyFilter: 'all',
    selectedCategoryFilter: 'all',
    selectedMedFilter: 'all',
    searchQuery: '',
    currentDate: new Date().toISOString().split('T')[0]
  },

  apiUrl(action) {
    return `${this.apiEndpoint}?action=${action}`;
  },

  async init() {
    this.bindEvents();
    this.setupPwaInstall();

    // 1º Tenta a API do Cloudflare Pages (functions/api.js com D1)
    try {
      const resCF = await fetch('api?action=get_all_data');
      if (resCF.ok && resCF.headers.get('content-type')?.includes('application/json')) {
        const data = await resCF.json();
        if (data.success) {
          this.apiEndpoint = 'api';
          this.useLocalDB = false;
          console.log('✅ Conectado ao Cloudflare D1');
          await this.processLoadedData(data);
          return;
        }
      }
    } catch (e) {}

    // 2º Tenta o PHP local do XAMPP
    try {
      const resPHP = await fetch('api.php?action=get_all_data');
      if (resPHP.ok && resPHP.headers.get('content-type')?.includes('application/json')) {
        const data = await resPHP.json();
        if (data.success) {
          this.apiEndpoint = 'api.php';
          this.useLocalDB = false;
          console.log('✅ Conectado ao PHP/SQLite local');
          await this.processLoadedData(data);
          return;
        }
      }
    } catch (e) {}

    // 3º Fallback para LocalDB seguro
    console.log('ℹ️ Operando via armazenamento local persistente');
    this.useLocalDB = true;
    this.localDB.init();
    await this.loadData();

    if (this.state.appointments.length === 0 && this.state.exams.length === 0) {
      await this.seedSamples(true);
    }
  },

  setupPwaInstall() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('✅ Service Worker PWA ativo'))
        .catch(err => console.log('Aviso SW:', err));
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      const installBtns = document.querySelectorAll('.btn-install-pwa');
      installBtns.forEach(btn => btn.style.display = 'inline-flex');
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      document.querySelectorAll('.btn-install-pwa').forEach(btn => btn.style.display = 'none');
      this.showToast('Aplicativo instalado no celular!', 'success');
    });
  },

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  },

  async requestNotificationPermission() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      alert('Seu navegador ou aparelho não suporta Notificações Push.');
      return false;
    }

    let permission = Notification.permission;
    if (permission !== 'granted' && permission !== 'denied') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      this.showToast('Permissão de notificação negada no navegador.', 'warning');
      return false;
    }

    // Registra a inscrição Push no Servidor (VAPID)
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      // Busca a chave pública VAPID da nossa API (Cloudflare ou local)
      let publicKey = 'BHLVYyEtgS03hBshXPDbjgNtYZ6kQzydxFtSxC0W_A-roF5Ypj8lnoV9KbH_dPoDa5tLob5NUs1KmELCav37_40';
      try {
        const keyRes = await fetch(this.apiUrl('get_vapid_public_key'));
        const keyData = await keyRes.json();
        if (keyData.success && keyData.publicKey) {
          publicKey = keyData.publicKey;
        }
      } catch (e) {
        console.warn('Erro ao obter vapid key:', e);
      }

      if (!sub) {
        const convertedVapidKey = this.urlBase64ToUint8Array(publicKey);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      }

      // Envia os dados do aparelho para salvar no banco (D1 ou SQLite)
      const subJson = sub.toJSON();
      const saveRes = await fetch(this.apiUrl('save_push_subscription'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subJson)
      });
      const saveResult = await saveRes.json();

      if (!saveResult.success) {
        alert('Erro ao registrar aparelho no servidor: ' + (saveResult.error || 'Desconhecido'));
        return false;
      }

      return true;
    } catch (e) {
      console.error('Erro ao subscrever push:', e);
      alert('Aviso de Inscrição Push: ' + e.message + '\n\nNota: Para o celular registrar no servidor, você precisa estar acessando via HTTPS (ou localhost no PC).');
      return false;
    }
  },

  async testLocalNotification() {
    try {
      this.showToast('Ativando alertas no aparelho...', 'info');
      const granted = await this.requestNotificationPermission();
      if (!granted) return;

      this.showToast('✅ Aparelho cadastrado! Testando disparo do servidor...', 'success');

      // Faz a requisição ao servidor para disparar o Push real pelo Google/Apple
      setTimeout(async () => {
        try {
          const testUrl = this.apiUrl('send_test_push');
          const res = await fetch(testUrl);
          const data = await res.json();
          if (data.success && data.enviados > 0) {
            this.showToast('🚀 Notificação disparada pelo servidor!', 'success');
          } else {
            // Se foi cadastrado no D1 com sucesso
            this.showToast('✅ Celular registrado no Cloudflare com sucesso!', 'success');
          }
        } catch (err) {
          console.log('Disparo teste:', err);
          this.showToast('✅ Aparelho cadastrado no Cloudflare!', 'success');
        }
      }, 1500);
    } catch (e) {
      console.error('Erro:', e);
    }
  },

  async promptInstall() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        this.showToast('Instalando aplicativo...', 'info');
      }
      deferredInstallPrompt = null;
    } else {
      alert('Para instalar no celular:\n\nNo Android (Chrome): Toque nos 3 pontinhos e escolha "Instalar aplicativo" ou "Adicionar à tela inicial".\n\nNo iPhone (Safari): Toque no botão de Compartilhar e selecione "Adicionar à Tela de Início".');
    }
  },

  async processLoadedData(data) {
    this.state.persons = data.persons || [];
    this.state.appointments = data.appointments || [];
    this.state.exams = data.exams || [];
    this.state.medications = data.medications || [];
    this.state.trips = data.trips || [];
    this.state.summary = data.summary || {};
    this.state.currentDate = data.current_date || new Date().toISOString().split('T')[0];

    this.updateBadges();
    this.populatePersonSelects();
    this.populateAppointmentSelects();
    this.renderCurrentTab();
  },

  /* =========================================================================
     ARMAZENAMENTO LOCAL COM OS 6 NOMES FIXOS
     ========================================================================= */
  localDB: {
    STORAGE_KEY: 'sem_perder_a_data_db_v3',

    get() {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (e) { return null; }
    },

    save(data) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    },

    init() {
      let data = this.get();
      if (!data || !data.appointments || data.appointments.length === 0) {
        const today = new Date().toISOString().split('T')[0];
        data = {
          persons: [
            { id: 1, name: 'Ednéia', color: '#8b5cf6' },
            { id: 2, name: 'Mãe', color: '#ec4899' },
            { id: 3, name: 'Edyr', color: '#2563eb' },
            { id: 4, name: 'Carlos Romeu', color: '#059669' },
            { id: 5, name: 'Rogério', color: '#ea580c' },
            { id: 6, name: 'Tia Mariazinha', color: '#0891b2' }
          ],
          appointments: [
            {
              id: 1,
              person_id: 2,
              doctor_name: 'Dr. Roberto Mendes',
              specialty: 'Cardiologia (Consulta de Rotina)',
              location_name: 'Hospital São Camilo',
              city: 'Cruzeiro',
              appointment_date: today,
              appointment_time: '08:30',
              status: 'agendada',
              notes: 'Levar exames anteriores e lista de remédios'
            },
            {
              id: 2,
              person_id: 6,
              doctor_name: 'Agência INSS',
              specialty: 'INSS - Prova de Vida e Atualização',
              location_name: 'Posto do INSS Centro',
              city: 'Resende',
              appointment_date: today,
              appointment_time: '10:00',
              status: 'agendada',
              notes: 'Levar RG, CPF e comprovante de residência'
            },
            {
              id: 3,
              person_id: 5,
              doctor_name: 'Gerente Carlos',
              specialty: 'Banco do Brasil - Saque de Benefício',
              location_name: 'Agência Centro',
              city: 'Resende',
              appointment_date: today,
              appointment_time: '11:15',
              status: 'agendada',
              notes: 'Aproveitar a mesma ida a Resende'
            }
          ],
          exams: [
            {
              id: 1,
              person_id: 1,
              exam_name: 'Ecocardiograma com Doppler',
              target_appointment_id: 1,
              exam_date: today,
              exam_time: '09:45',
              location_name: 'Laboratório Pasteur',
              city: 'Cruzeiro',
              status: 'pronto_levar',
              result_notes: 'Laudo pronto para levar ao cardiologista'
            }
          ],
          medications: [
            {
              id: 1,
              person_id: 6,
              name: 'Losartana Potássica',
              dosage: '50mg',
              instructions: '1 comprimido pela manhã',
              needs_purchase: 1,
              preferred_city: 'Resende'
            },
            {
              id: 2,
              person_id: 2,
              name: 'Omeprazol',
              dosage: '20mg',
              instructions: '1 cápsula em jejum',
              needs_purchase: 0,
              preferred_city: 'Cruzeiro'
            }
          ]
        };
        this.save(data);
      }
    },

    calculateData() {
      const data = this.get() || { persons: [], appointments: [], exams: [], medications: [] };
      const persons = data.persons;
      const personMap = {};
      persons.forEach(p => personMap[p.id] = p);

      const appointments = data.appointments.map(a => {
        const p = personMap[a.person_id] || { name: 'Pessoa', color: '#3b82f6' };
        const examsToBring = data.exams.filter(e => e.target_appointment_id == a.id).length;
        return {
          ...a,
          person_name: p.name,
          person_color: p.color,
          exams_to_bring_count: examsToBring
        };
      }).sort((a, b) => (a.appointment_date + (a.appointment_time || '')).localeCompare(b.appointment_date + (b.appointment_time || '')));

      const exams = data.exams.map(e => {
        const p = personMap[e.person_id] || { name: 'Pessoa', color: '#3b82f6' };
        const targetApp = appointments.find(a => a.id == e.target_appointment_id);
        return {
          ...e,
          person_name: p.name,
          person_color: p.color,
          target_appointment_date: targetApp ? targetApp.appointment_date : null,
          target_doctor_name: targetApp ? targetApp.doctor_name : null,
          target_specialty: targetApp ? targetApp.specialty : null,
          target_city: targetApp ? targetApp.city : null
        };
      });

      const medications = data.medications.map(m => {
        const p = personMap[m.person_id] || { name: 'Pessoa', color: '#3b82f6' };
        return {
          ...m,
          person_name: p.name,
          person_color: p.color
        };
      }).sort((a, b) => (b.needs_purchase || 0) - (a.needs_purchase || 0));

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

      return { persons, appointments, exams, medications, trips, summary, current_date: today };
    }
  },

  bindEvents() {
    // Menu Inferior (Bottom Navigation Bar)
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Fechamento de Modais
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.closest('.modal-close-btn') || e.target.closest('.btn-cancel-modal')) {
          this.closeAllModals();
        }
      });
    });
  },

  async loadData() {
    if (this.useLocalDB) {
      const calc = this.localDB.calculateData();
      await this.processLoadedData(calc);
      return;
    }

    try {
      const res = await fetch(this.apiUrl('get_all_data'));
      const data = await res.json();
      if (data.success) {
        await this.processLoadedData(data);
      }
    } catch (err) {
      this.useLocalDB = true;
      this.localDB.init();
      return this.loadData();
    }
  },

  switchTab(tabName) {
    if (tabName === 'exames' || tabName === 'dashboard') {
      tabName = 'consultas';
    }
    this.state.currentTab = tabName;
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
      let isActive = btn.dataset.tab === tabName;
      btn.classList.toggle('active', isActive);
    });
    this.renderCurrentTab();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  async seedSamples(force = false) {
    if (this.state.appointments.length > 0 && !force) return;
    const today = new Date().toISOString().split('T')[0];
    const data = this.localDB.get() || {};
    data.appointments = [
      {
        id: 1,
        person_id: 2,
        doctor_name: 'Dr. Roberto Mendes',
        specialty: 'Cardiologia (Consulta de Rotina)',
        location_name: 'Hospital São Camilo',
        city: 'Cruzeiro',
        appointment_date: today,
        appointment_time: '08:30',
        status: 'agendada',
        notes: 'Levar exames anteriores e lista de remédios'
      },
      {
        id: 2,
        person_id: 6,
        doctor_name: 'Agência INSS',
        specialty: 'INSS - Prova de Vida e Atualização',
        location_name: 'Posto do INSS Centro',
        city: 'Resende',
        appointment_date: today,
        appointment_time: '10:00',
        status: 'agendada',
        notes: 'Levar RG, CPF e comprovante de residência'
      },
      {
        id: 3,
        person_id: 5,
        doctor_name: 'Gerente Carlos',
        specialty: 'Banco do Brasil - Saque de Benefício',
        location_name: 'Agência Centro',
        city: 'Resende',
        appointment_date: today,
        appointment_time: '11:15',
        status: 'agendada',
        notes: 'Aproveitar a mesma ida a Resende'
      }
    ];
    data.exams = [
      {
        id: 1,
        person_id: 1,
        exam_name: 'Ecocardiograma com Doppler',
        target_appointment_id: 1,
        exam_date: today,
        exam_time: '09:45',
        location_name: 'Laboratório Pasteur',
        city: 'Cruzeiro',
        status: 'pronto_levar',
        result_notes: 'Laudo pronto para levar ao cardiologista'
      }
    ];
    data.medications = [
      {
        id: 1,
        person_id: 6,
        name: 'Losartana Potássica',
        dosage: '50mg',
        instructions: '1 comprimido pela manhã',
        needs_purchase: 1,
        preferred_city: 'Resende'
      },
      {
        id: 2,
        person_id: 2,
        name: 'Omeprazol',
        dosage: '20mg',
        instructions: '1 cápsula em jejum',
        needs_purchase: 0,
        preferred_city: 'Cruzeiro'
      }
    ];
    this.localDB.save(data);
    await this.loadData();
  },

  updateBadges() {
    const s = this.state.summary;
    const badgeTrips = document.getElementById('badge-bottom-trips');
    const badgeConsultas = document.getElementById('badge-bottom-consultas');
    const badgeExames = document.getElementById('badge-bottom-exames');
    const badgeRemedios = document.getElementById('badge-bottom-remedios');

    if (badgeTrips) {
      badgeTrips.textContent = s.shared_trips_count || '';
      badgeTrips.style.display = s.shared_trips_count > 0 ? 'inline-block' : 'none';
    }
    if (badgeConsultas) {
      const totalEvents = (this.state.appointments.length || 0) + (this.state.exams.length || 0);
      badgeConsultas.textContent = totalEvents || '';
      badgeConsultas.style.display = totalEvents > 0 ? 'inline-block' : 'none';
    }
    if (badgeExames) {
      badgeExames.textContent = s.exams_ready_to_bring > 0 ? s.exams_ready_to_bring : (this.state.exams.length || '');
      badgeExames.style.display = this.state.exams.length > 0 ? 'inline-block' : 'none';
    }
    if (badgeRemedios) {
      badgeRemedios.textContent = s.meds_to_buy > 0 ? s.meds_to_buy : '';
      badgeRemedios.style.display = s.meds_to_buy > 0 ? 'inline-block' : 'none';
    }
  },

  setPersonFilter(personId) {
    this.state.selectedFamilyFilter = personId;
    this.renderCurrentTab();
  },

  setWeekFilter(filter) {
    this.state.selectedWeekFilter = filter;
    this.renderCurrentTab();
  },

  getWeekBounds(offsetWeeks = 0) {
    const todayStr = this.state.currentDate || new Date().toISOString().split('T')[0];
    const base = new Date(todayStr + 'T12:00:00');
    const dayOfWeek = base.getDay(); // 0: domingo, 1: segunda...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(base);
    monday.setDate(base.getDate() + diffToMonday + (offsetWeeks * 7));

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const pad = n => String(n).padStart(2, '0');
    const toYMD = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    return {
      start: toYMD(monday),
      end: toYMD(sunday),
      startFormatted: `${pad(monday.getDate())}/${pad(monday.getMonth() + 1)}`,
      endFormatted: `${pad(sunday.getDate())}/${pad(sunday.getMonth() + 1)}`
    };
  },

  getDayOfWeekName(dateStr) {
    if (!dateStr || dateStr.startsWith('9999')) return 'Sem data definida';
    const parts = dateStr.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return dayNames[d.getDay()] || '';
  },

  getDayFormattedLong(dateStr) {
    if (!dateStr || dateStr.startsWith('9999')) return 'A definir data';
    const parts = dateStr.split('-');
    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
    const dayOfWeek = dayNames[d.getDay()];
    const day = parts[2];
    const month = monthNames[parseInt(parts[1], 10) - 1] || '';
    return `${dayOfWeek}, ${day} de ${month}`;
  },

  getRelativeDayBadge(dateStr) {
    const today = this.state.currentDate || new Date().toISOString().split('T')[0];
    if (dateStr === today) {
      return '<span class="day-badge today">🟢 HOJE</span>';
    }
    const t = new Date(today + 'T12:00:00');
    t.setDate(t.getDate() + 1);
    const pad = n => String(n).padStart(2, '0');
    const tomYMD = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
    if (dateStr === tomYMD) {
      return '<span class="day-badge tomorrow">🔵 AMANHÃ</span>';
    }
    return '';
  },

  getWeekFilterButtonsHtml(thisWeek, nextWeek) {
    const cur = this.state.selectedWeekFilter || 'esta_semana';
    return `
      <div class="week-filter-segmented">
        <button type="button" class="week-filter-btn ${cur === 'esta_semana' ? 'active' : ''}" onclick="App.setWeekFilter('esta_semana')">
          📅 Esta Semana (${thisWeek.startFormatted} - ${thisWeek.endFormatted})
        </button>
        <button type="button" class="week-filter-btn ${cur === 'proxima_semana' ? 'active' : ''}" onclick="App.setWeekFilter('proxima_semana')">
          ⏭️ Próxima (${nextWeek.startFormatted} - ${nextWeek.endFormatted})
        </button>
        <button type="button" class="week-filter-btn ${cur === 'todos' ? 'active' : ''}" onclick="App.setWeekFilter('todos')">
          🗂️ Todos
        </button>
      </div>
    `;
  },

  getPersonPillsFilterHtml() {
    const cur = this.state.selectedFamilyFilter;
    return `
      <div class="person-filter-carousel">
        <button type="button" class="person-pill-btn ${cur === 'all' ? 'active' : ''}" onclick="App.setPersonFilter('all')">
          👥 Todos (${this.state.persons.length})
        </button>
        ${this.state.persons.map(p => `
          <button type="button" class="person-pill-btn ${cur == p.id ? 'active' : ''}" onclick="App.setPersonFilter(${p.id})">
            <span class="person-dot-indicator" style="background-color: ${p.color};"></span>
            ${this.escapeHtml(p.name)}
          </button>
        `).join('')}
      </div>
    `;
  },

  getWeekSummaryBannerHtml(eventsCount, weekBounds, nextBounds) {
    const cur = this.state.selectedWeekFilter || 'esta_semana';
    let periodTitle = 'Agenda desta Semana';
    let periodSub = `De ${weekBounds.startFormatted} até ${weekBounds.endFormatted} • Todos os compromissos da família`;
    if (cur === 'proxima_semana') {
      periodTitle = 'Agenda da Próxima Semana';
      periodSub = `De ${nextBounds.startFormatted} até ${nextBounds.endFormatted} • Planejamento antecipado`;
    } else if (cur === 'todos') {
      periodTitle = 'Todos os Compromissos';
      periodSub = 'Visão de todos os agendamentos cadastrados';
    }

    return `
      <div class="agenda-hero-card">
        <div class="agenda-hero-top">
          <div>
            <span class="agenda-hero-tag">Agenda da Ednéia</span>
            <h2 class="agenda-hero-title">${periodTitle}</h2>
          </div>
          <div class="agenda-hero-badge">
            <span class="hero-count-num">${eventsCount}</span>
            <span class="hero-count-lbl">${eventsCount === 1 ? 'evento' : 'eventos'}</span>
          </div>
        </div>
        <p class="agenda-hero-desc">${periodSub}</p>
      </div>
    `;
  },

  onSearchInput(val, inputEl) {
    this.state.searchQuery = val || '';
    const clearBtn = document.getElementById('search-clear-btn');
    if (clearBtn) clearBtn.style.display = val ? 'flex' : 'none';

    // Se estivermos na aba de Agenda (consultas) e o container já existir, atualiza apenas a lista
    if (this.state.currentTab === 'consultas' && document.getElementById('agenda-events-list')) {
      this.updateAgendaListOnly();
      return;
    }

    // Se estivermos no Painel (dashboard) e o container já existir
    if (this.state.currentTab === 'dashboard' && document.getElementById('dashboard-upcoming-list')) {
      this.updateDashboardListOnly();
      return;
    }

    // Se estivermos na aba de Remédios
    if (this.state.currentTab === 'remedios' && document.getElementById('remedios-list-container')) {
      this.updateRemediosListOnly();
      return;
    }

    // Fallback caso a aba precise ser re-renderizada: preserva foco e cursor
    const cursor = inputEl ? inputEl.selectionStart : null;
    this.renderCurrentTab();
    const newInput = document.querySelector('.search-input');
    if (newInput) {
      newInput.focus();
      if (cursor !== null) {
        newInput.setSelectionRange(cursor, cursor);
      }
    }
  },

  clearSearch() {
    this.state.searchQuery = '';
    const input = document.querySelector('.search-input');
    if (input) input.value = '';
    const clearBtn = document.getElementById('search-clear-btn');
    if (clearBtn) clearBtn.style.display = 'none';

    if (this.state.currentTab === 'consultas' && document.getElementById('agenda-events-list')) {
      this.updateAgendaListOnly();
    } else if (this.state.currentTab === 'dashboard' && document.getElementById('dashboard-upcoming-list')) {
      this.updateDashboardListOnly();
    } else if (this.state.currentTab === 'remedios' && document.getElementById('remedios-list-container')) {
      this.updateRemediosListOnly();
    } else {
      this.renderCurrentTab();
    }
  },

  setCategoryFilter(cat) {
    this.state.selectedCategoryFilter = cat;
    this.renderCurrentTab();
  },

  setMedFilter(filter) {
    this.state.selectedMedFilter = filter;
    this.renderCurrentTab();
  },

  getAppointmentCategory(app) {
    const text = `${app.specialty || ''} ${app.doctor_name || ''} ${app.notes || ''}`.toLowerCase();
    if (text.includes('inss') || text.includes('previd') || text.includes('perícia') || text.includes('pericia')) {
      return 'inss';
    }
    if (text.includes('banco') || text.includes('benefício') || text.includes('beneficio') || text.includes('pagamento') || text.includes('saque') || text.includes('bradesco') || text.includes('brasil') || text.includes('caixa') || text.includes('itaú') || text.includes('itau') || text.includes('santander')) {
      return 'banco';
    }
    if (text.includes('cartório') || text.includes('cartorio') || text.includes('documento') || text.includes('mercado') || text.includes('compras')) {
      return 'outro';
    }
    return 'saude';
  },

  getSearchBarHtml(placeholder = 'Buscar por médico, cidade, pessoa...') {
    const hasQuery = Boolean(this.state.searchQuery);
    return `
      <div class="search-filter-bar">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text"
                 class="search-input"
                 placeholder="${placeholder}"
                 value="${this.escapeHtml(this.state.searchQuery)}"
                 oninput="App.onSearchInput(this.value, this)"
                 onkeydown="if(event.key==='Escape'){ App.clearSearch(); }">
          <button type="button" 
                  class="search-clear-btn" 
                  id="search-clear-btn" 
                  style="display: ${hasQuery ? 'flex' : 'none'};" 
                  onclick="App.clearSearch()" 
                  title="Limpar busca">&times;</button>
        </div>
        <button class="btn-search-filter" onclick="App.openNewSheet()" title="Novo Agendamento">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>
    `;
  },

  getCategoryPillsHtml() {
    const cur = this.state.selectedCategoryFilter;
    const cats = [
      { id: 'all', label: 'Todos' },
      { id: 'saude', label: '🩺 Consultas' },
      { id: 'exame', label: '🔬 Exames' },
      { id: 'inss', label: '🏛️ INSS' },
      { id: 'banco', label: '🏦 Banco' },
      { id: 'outro', label: '📋 Outro' }
    ];
    return `
      <div class="pill-filters-scroll">
        ${cats.map(c => `
          <button class="filter-pill-btn ${cur === c.id ? 'active' : ''}" onclick="App.setCategoryFilter('${c.id}')">
            ${c.label}
          </button>
        `).join('')}
      </div>
    `;
  },

  getMedPillsHtml() {
    const cur = this.state.selectedMedFilter;
    const filters = [
      { id: 'all', label: 'Todos' },
      { id: 'comprar', label: '🛒 Falta Comprar' },
      { id: 'em_dia', label: '✅ Em Dia' }
    ];
    return `
      <div class="pill-filters-scroll">
        ${filters.map(f => `
          <button class="filter-pill-btn ${cur === f.id ? 'active' : ''}" onclick="App.setMedFilter('${f.id}')">
            ${f.label}
          </button>
        `).join('')}
      </div>
    `;
  },

  getFilterSelectHtml() {
    return `
      <div class="person-filter-wrapper">
        <span class="person-filter-label">👤 Filtrar:</span>
        <select class="person-filter-select" onchange="App.setPersonFilter(this.value)">
          <option value="all" ${this.state.selectedFamilyFilter === 'all' ? 'selected' : ''}>Todas as 6 Pessoas</option>
          ${this.state.persons.map(p => `
            <option value="${p.id}" ${this.state.selectedFamilyFilter == p.id ? 'selected' : ''}>
              ${this.escapeHtml(p.name)}
            </option>
          `).join('')}
        </select>
      </div>
    `;
  },

  renderCurrentTab() {
    const content = document.getElementById('tab-content-area');
    if (!content) return;

    switch (this.state.currentTab) {
      case 'logistica':
        this.renderLogisticaTab(content);
        break;
      case 'dashboard':
        this.renderDashboardTab(content);
        break;
      case 'consultas':
        this.renderConsultasTab(content);
        break;
      case 'exames':
        this.renderExamesTab(content);
        break;
      case 'remedios':
        this.renderRemediosTab(content);
        break;
      case 'familiares':
        this.renderPessoasTab(content);
        break;
    }
  },

  /* =========================================================================
     ABA 1: VIAGENS E CARONA
     ========================================================================= */
  renderLogisticaTab(container) {
    const trips = this.state.trips;

    let html = `
      <div class="logistics-hero-banner">
        <div class="banner-tag">🚗 Carona e Economia</div>
        <h2 class="banner-title">Otimizador de Saídas da Ednéia</h2>
        <p class="banner-desc">
          O sistema agrupa quem tem consulta ou exame na mesma cidade e data para economizar viagens e tempo!
        </p>
      </div>

      <div class="action-bar">
        <div class="action-bar-title">
          <span>📅 Viagens Programadas</span>
          <span class="status-pill status-agendado">${trips.length} data(s)</span>
        </div>
        <button class="btn btn-sm btn-primary" onclick="App.openNewSheet()">
          <span>+ Agendar</span>
        </button>
      </div>
    `;

    if (trips.length === 0) {
      html += `
        <div class="empty-state">
          <div class="empty-state-icon">🚗</div>
          <h3>Nenhuma viagem programada</h3>
          <p>Cadastre consultas e exames para que o sistema organize as saídas por cidade.</p>
          <button class="btn btn-primary" style="margin-top: 0.85rem;" onclick="App.openModal('modal-appointment')">
            + Agendar Consulta
          </button>
        </div>
      `;
      container.innerHTML = html;
      return;
    }

    trips.forEach(trip => {
      const isShared = trip.is_shared_ride;
      const dateParts = trip.date.split('-');
      const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthStr = monthNames[parseInt(dateParts[1], 10) - 1];

      html += `
        <div class="trip-card ${isShared ? 'shared-trip' : ''}">
          <div class="trip-card-header">
            <div class="trip-date-info">
              <div class="trip-calendar-box">
                <div class="month">${monthStr}</div>
                <div class="day">${dateParts[2]}</div>
              </div>
              <div class="trip-meta-title">
                <h3>
                  📍 ${this.escapeHtml(trip.city)}
                </h3>
                <p>${formattedDate} • ${trip.total_events} compromisso(s)</p>
              </div>
            </div>
            
            <div>
              <span class="status-pill ${isShared ? 'status-pronto' : 'status-agendado'}">
                ${isShared ? '🌟 ' + trip.total_people + ' Pessoas Juntas' : '1 Pessoa'}
              </span>
            </div>
          </div>

          <div class="trip-body">
            <!-- Pessoas no carro -->
            <div class="trip-passengers">
              ${trip.people.map(p => `
                <span class="passenger-pill" style="background-color: ${p.color};">
                  👤 ${this.escapeHtml(p.name)}
                </span>
              `).join('')}
            </div>

            <!-- Paradas -->
            <div class="timeline-stops">
              ${trip.events.map(ev => `
                <div class="stop-item">
                  <div class="stop-time">${ev.time && ev.time !== 'Sem hora' ? ev.time.substring(0, 5) : '--:--'}</div>
                  <div class="stop-details">
                    <span class="stop-person-tag" style="background-color: ${ev.person_color};">
                      ${this.escapeHtml(ev.person_name)}
                    </span>
                    <div class="stop-title">${this.escapeHtml(ev.title)}</div>
                    <div class="stop-location">🏢 ${this.escapeHtml(ev.location)} (${this.escapeHtml(ev.city)})</div>
                    ${ev.exams_to_bring > 0 ? `
                      <div style="margin-top:0.25rem; font-size:0.78rem; color:#b45309; font-weight:800;">
                        ⚠️ LEVAR ${ev.exams_to_bring} EXAME(S) NESTA CONSULTA!
                      </div>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>

            ${trip.meds_to_buy && trip.meds_to_buy.length > 0 ? `
              <div class="pharmacy-hint-box">
                <span style="font-size:1.2rem;">💊</span>
                <div>
                  <strong>Aproveite para comprar remédios em ${this.escapeHtml(trip.city)}:</strong>
                  <div style="margin-top: 0.2rem; font-size: 0.8rem;">
                    ${trip.meds_to_buy.map(m => `• ${this.escapeHtml(m.name)} (para ${this.escapeHtml(m.person_name)})`).join('<br>')}
                  </div>
                </div>
              </div>
            ` : ''}

          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  /* =========================================================================
     ABA 2 / ABA PRINCIPAL: AGENDA DA SEMANA (SIMPLIFICADA E OBJETIVA)
     ========================================================================= */
  renderDashboardTab(container) {
    // Redireciona diretamente para a Agenda Simplificada da Semana
    this.renderConsultasTab(container);
  },

  getFilteredAgendaEvents() {
    const q = (this.state.searchQuery || '').trim().toLowerCase();
    const catFilter = this.state.selectedCategoryFilter;
    const personFilter = this.state.selectedFamilyFilter;
    const weekFilter = this.state.selectedWeekFilter || 'esta_semana';
    const thisWeek = this.getWeekBounds(0);
    const nextWeek = this.getWeekBounds(1);

    // Filtra Compromissos
    const appointments = this.state.appointments.filter(a => {
      if (personFilter !== 'all' && a.person_id != personFilter) return false;
      if (catFilter === 'exame') return false;
      if (catFilter !== 'all' && this.getAppointmentCategory(a) !== catFilter) return false;

      // Filtro de Semana (apenas quando não houver busca ativa por texto)
      if (!q) {
        if (weekFilter === 'esta_semana') {
          if (!a.appointment_date || a.appointment_date < thisWeek.start || a.appointment_date > thisWeek.end) return false;
        } else if (weekFilter === 'proxima_semana') {
          if (!a.appointment_date || a.appointment_date < nextWeek.start || a.appointment_date > nextWeek.end) return false;
        }
      }

      if (q) {
        const str = `${a.specialty || ''} ${a.doctor_name || ''} ${a.person_name || ''} ${a.city || ''} ${a.location_name || ''} ${a.notes || ''}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });

    // Filtra Exames
    const exams = this.state.exams.filter(e => {
      if (personFilter !== 'all' && e.person_id != personFilter) return false;
      if (catFilter !== 'all' && catFilter !== 'exame') return false;

      const eDate = e.exam_date || e.target_appointment_date;
      if (!q) {
        if (weekFilter === 'esta_semana') {
          if (!eDate || eDate < thisWeek.start || eDate > thisWeek.end) return false;
        } else if (weekFilter === 'proxima_semana') {
          if (!eDate || eDate < nextWeek.start || eDate > nextWeek.end) return false;
        }
      }

      if (q) {
        const str = `${e.exam_name || ''} ${e.target_doctor_name || ''} ${e.target_specialty || ''} ${e.location_name || ''} ${e.city || ''} ${e.person_name || ''} ${e.result_notes || ''}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });

    // Unifica todos os eventos
    const events = [
      ...appointments.map(a => ({
        type: 'appointment',
        sortDate: a.appointment_date || '9999-12-31',
        sortTime: a.appointment_time || '00:00',
        city: a.city,
        person_name: a.person_name,
        person_id: a.person_id,
        data: a
      })),
      ...exams.map(e => ({
        type: 'exam',
        sortDate: e.exam_date || (e.target_appointment_date || '9999-12-30'),
        sortTime: e.exam_time || '00:00',
        city: e.city,
        person_name: e.person_name,
        person_id: e.person_id,
        data: e
      }))
    ];

    events.sort((a, b) => {
      const dA = a.sortDate + ' ' + a.sortTime;
      const dB = b.sortDate + ' ' + b.sortTime;
      return dA.localeCompare(dB);
    });

    // Pedidos de exames pendentes sem data definida
    const unplannedExams = this.state.exams.filter(e => {
      if (personFilter !== 'all' && e.person_id != personFilter) return false;
      return (!e.exam_date && !e.target_appointment_date) || e.status === 'aguardando_agendamento';
    });

    return {
      events,
      appointmentsCount: appointments.length,
      examsCount: exams.length,
      unplannedExamsCount: unplannedExams.length,
      unplannedExams
    };
  },

  getEventsListHtml(events, q, unplannedExams = []) {
    if (events.length === 0) {
      const weekFilter = this.state.selectedWeekFilter || 'esta_semana';
      let emptyMsg = 'Nenhum compromisso agendado para esta semana';
      let emptySub = 'Toque nos botões acima para ver a Próxima Semana, Todos os Agendamentos, ou agende um novo compromisso no (+).';
      if (weekFilter === 'proxima_semana') {
        emptyMsg = 'Nenhum compromisso agendado para a próxima semana';
        emptySub = 'Tudo calmo na próxima semana! Toque em "Esta Semana" ou cadastre um compromisso.';
      } else if (weekFilter === 'todos') {
        emptyMsg = 'Nenhum evento encontrado no histórico';
        emptySub = 'Toque no botão (+) para cadastrar consultas, exames ou idas ao banco/INSS.';
      }
      if (q) {
        emptyMsg = 'Nenhum resultado para a busca';
        emptySub = 'Tente buscar com outro termo ou toque no botão de limpar busca.';
      }

      return `
        <div class="empty-state">
          <div class="empty-state-icon">📅</div>
          <h3>${emptyMsg}</h3>
          <p>${emptySub}</p>
          <div style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-sm btn-primary" onclick="App.openModal('modal-appointment')">+ Compromisso</button>
            <button class="btn btn-sm btn-secondary" onclick="App.openModal('modal-exam')">+ Exame</button>
          </div>
        </div>
      `;
    }

    // Agrupa os eventos por data (YYYY-MM-DD)
    const grouped = {};
    events.forEach(item => {
      const dateKey = item.sortDate;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(item);
    });

    let html = `<div class="agenda-days-container">`;

    // Aviso de pedidos de exame sem data marcada (visível quando na visão "todos")
    if (unplannedExams && unplannedExams.length > 0 && this.state.selectedWeekFilter === 'todos') {
      html += `
        <div class="pending-notice-card">
          <div class="pending-notice-left">
            <span class="pending-notice-icon">🔬</span>
            <div>
              <strong>${unplannedExams.length} Pedido(s) de Exame sem Data Definida</strong>
              <p>Exames solicitados que ainda precisam ser marcados no laboratório ou posto.</p>
            </div>
          </div>
          <button class="btn btn-xs btn-outline-primary" onclick="App.switchTab('exames')">Ver Exames</button>
        </div>
      `;
    }

    Object.keys(grouped).forEach(dateStr => {
      const dayEvents = grouped[dateStr];
      const dayName = this.getDayOfWeekName(dateStr);
      const dayFormattedLong = this.getDayFormattedLong(dateStr);
      const relativeBadge = this.getRelativeDayBadge(dateStr);
      const isToday = (dateStr === this.state.currentDate);

      // Detecta se há mais de 1 pessoa na mesma cidade nesse dia (Carona / Otimização)
      const citiesOnDay = {};
      dayEvents.forEach(ev => {
        const c = (ev.city || '').trim();
        if (c) {
          if (!citiesOnDay[c]) citiesOnDay[c] = new Set();
          citiesOnDay[c].add(ev.person_name);
        }
      });

      let caronaNoticeHtml = '';
      Object.keys(citiesOnDay).forEach(cName => {
        const personsInCity = Array.from(citiesOnDay[cName]);
        if (personsInCity.length > 1) {
          caronaNoticeHtml += `
            <div class="day-carona-alert">
              <span>🚗</span>
              <div>
                <strong>Carona no dia para ${this.escapeHtml(cName)}:</strong>
                <span>${personsInCity.map(p => this.escapeHtml(p)).join(' e ')} vão na mesma cidade!</span>
              </div>
            </div>
          `;
        }
      });

      html += `
        <div class="agenda-day-block">
          <div class="agenda-day-header ${isToday ? 'header-today' : ''}">
            <div class="day-header-left">
              <span class="day-name">${dayFormattedLong}</span>
              <span class="day-date">${dayName}</span>
            </div>
            <div class="day-header-right">
              ${relativeBadge}
              <span class="day-count-pill">${dayEvents.length} ${dayEvents.length === 1 ? 'evento' : 'eventos'}</span>
            </div>
          </div>

          ${caronaNoticeHtml}

          <div class="agenda-day-cards">
            ${dayEvents.map(item => {
              if (item.type === 'appointment') {
                return this.getAppointmentCardHtml(item.data);
              } else {
                return this.getExamCardHtml(item.data);
              }
            }).join('')}
          </div>
        </div>
      `;
    });

    html += `</div>`;
    return html;
  },

  updateAgendaListOnly() {
    const listEl = document.getElementById('agenda-events-list');
    const badgeEl = document.getElementById('agenda-count-badge');
    if (!listEl) {
      this.renderCurrentTab();
      return;
    }
    const { events, unplannedExams } = this.getFilteredAgendaEvents();
    const q = (this.state.searchQuery || '').trim().toLowerCase();
    listEl.innerHTML = this.getEventsListHtml(events, q, unplannedExams);
    if (badgeEl) {
      badgeEl.textContent = events.length;
    }
  },

  updateDashboardListOnly() {
    this.updateAgendaListOnly();
  },

  renderConsultasTab(container) {
    const thisWeek = this.getWeekBounds(0);
    const nextWeek = this.getWeekBounds(1);
    const { events, unplannedExams } = this.getFilteredAgendaEvents();
    const q = (this.state.searchQuery || '').trim().toLowerCase();

    let html = `
      <!-- HERO BANNER RESUMO DA SEMANA -->
      ${this.getWeekSummaryBannerHtml(events.length, thisWeek, nextWeek)}

      <!-- SELETOR DE PERÍODO: ESTA SEMANA / PRÓXIMA / TODOS -->
      ${this.getWeekFilterButtonsHtml(thisWeek, nextWeek)}

      <!-- CARROSSEL DE PESSOAS ASSISTIDAS -->
      ${this.getPersonPillsFilterHtml()}

      <!-- BARRA DE BUSCA RÁPIDA -->
      ${this.getSearchBarHtml('Buscar por pessoa, médico, exame ou cidade...')}

      <!-- BARRA DE AÇÃO / BOTÕES RÁPIDOS -->
      <div class="action-bar" style="margin-top: 0.35rem; margin-bottom: 0.75rem;">
        <div class="action-bar-title">
          <span>📋 Compromissos da Agenda</span>
          <span class="status-pill status-agendado" id="agenda-count-badge">${events.length}</span>
        </div>
        <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
          <button class="btn btn-sm btn-primary" onclick="App.openModal('modal-appointment')" title="Novo Compromisso">
            <span>+ Compromisso</span>
          </button>
          <button class="btn btn-sm btn-secondary" onclick="App.openModal('modal-exam')" title="Novo Exame">
            <span>+ Exame</span>
          </button>
        </div>
      </div>

      <!-- LISTA DE EVENTOS DIA A DIA -->
      <div id="agenda-events-list">
        ${this.getEventsListHtml(events, q, unplannedExams)}
      </div>
    `;

    container.innerHTML = html;
  },

  getAppointmentCardHtml(app) {
    const specLower = (app.specialty || '').toLowerCase();
    let catIcon = '🩺';
    let catTag = 'Médico';
    let catClass = 'status-agendado';
    if (specLower.includes('inss') || specLower.includes('previd') || specLower.includes('perícia')) {
      catIcon = '🏛️';
      catTag = 'INSS';
      catClass = 'status-aguardando';
    } else if (specLower.includes('banco') || specLower.includes('benefício') || specLower.includes('pagamento') || specLower.includes('saque') || specLower.includes('bradesco') || specLower.includes('brasil') || specLower.includes('caixa')) {
      catIcon = '🏦';
      catTag = 'Banco';
      catClass = 'status-a-agendar';
    } else if (specLower.includes('cartório') || specLower.includes('documento') || specLower.includes('mercado') || specLower.includes('compras')) {
      catIcon = '📋';
      catTag = 'Outro';
    }

    return `
      <div class="item-card">
        <div class="item-card-header">
          <span class="person-badge" style="background-color: ${app.person_color};">
            👤 ${this.escapeHtml(app.person_name)}
          </span>
          <div style="display:flex; align-items:center; gap:0.35rem;">
            <span class="status-pill ${catClass}" style="font-size:0.7rem;">${catIcon} ${catTag}</span>
            <span class="status-pill ${app.status === 'realizada' ? 'status-concluido' : 'status-agendado'}">
              ${app.status === 'realizada' ? 'Concluído' : 'Agendado'}
            </span>
          </div>
        </div>

        <div class="item-title">
          ${this.escapeHtml(app.specialty)} ${app.doctor_name ? '• ' + this.escapeHtml(app.doctor_name) : ''}
        </div>

        <div class="item-meta-grid">
          <div class="item-meta-item">
            📅 <strong>${this.formatDate(app.appointment_date)}</strong>
          </div>
          <div class="item-meta-item">
            ⏰ <strong>${app.appointment_time ? app.appointment_time.substring(0, 5) : 'Sem hora'}</strong>
          </div>
          <div class="item-meta-item">
            📍 <strong>${this.escapeHtml(app.city)}</strong>
          </div>
          <div class="item-meta-item">
            🏢 ${this.escapeHtml(app.location_name || 'A confirmar')}
          </div>
        </div>

        ${app.notes ? `
          <div style="font-size:0.82rem; color:var(--text-muted); background:#f8fafc; padding:0.4rem 0.6rem; border-radius:var(--radius-sm); margin:0.4rem 0;">
            📝 <em>${this.escapeHtml(app.notes)}</em>
          </div>
        ` : ''}

        ${app.exams_to_bring_count > 0 ? `
          <div class="bring-to-appointment-box">
            <span>📋</span>
            <div><strong>Atenção:</strong> Levar <strong>${app.exams_to_bring_count} exame(s)</strong> neste compromisso!</div>
          </div>
        ` : ''}

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.6rem; padding-top:0.6rem; border-top:1px solid #f1f5f9; gap:0.4rem; flex-wrap:wrap;">
          <div style="display:flex; gap:0.35rem;">
            <button class="btn btn-sm btn-outline-primary" onclick="App.addExamForAppointment(${app.id}, ${app.person_id})">
              + Exame
            </button>
            <button class="btn btn-sm btn-secondary" onclick="App.toggleAppointmentStatus(${app.id}, '${app.status === 'realizada' ? 'agendada' : 'realizada'}')">
              ${app.status === 'realizada' ? 'Reabrir' : 'Concluído'}
            </button>
          </div>

          <div style="display:flex; gap:0.35rem;">
            <button class="btn btn-sm btn-secondary" onclick="App.editAppointment(${app.id})">Editar</button>
            <button class="btn btn-sm btn-secondary" style="color:var(--danger);" onclick="App.deleteAppointment(${app.id})">Excluir</button>
          </div>
        </div>
      </div>
    `;
  },

  getExamCardHtml(ex) {
    let statusBadge = '';
    switch (ex.status) {
      case 'a_agendar':
        statusBadge = '<span class="status-pill status-a-agendar">🟡 A Agendar</span>';
        break;
      case 'agendado':
        statusBadge = '<span class="status-pill status-agendado">🔵 Agendado</span>';
        break;
      case 'feito_aguardando':
        statusBadge = '<span class="status-pill status-aguardando">🟣 Aguardando Resultado</span>';
        break;
      case 'pronto_levar':
        statusBadge = '<span class="status-pill status-pronto">🟢 PRONTO P/ LEVAR!</span>';
        break;
      case 'concluido':
        statusBadge = '<span class="status-pill status-concluido">⚪ Concluído</span>';
        break;
    }

    return `
      <div class="item-card" style="border-left: 5px solid ${ex.person_color || '#008b9e'};">
        <div class="item-card-header">
          <div style="display:flex; align-items:center; gap:0.35rem; flex-wrap:wrap;">
            <span class="person-badge" style="background-color: ${ex.person_color};">
              👤 ${this.escapeHtml(ex.person_name)}
            </span>
            <span class="status-pill" style="background:#e0f2fe; color:#0369a1; font-weight:800; font-size:0.7rem;">
              🔬 Exame
            </span>
          </div>
          <div>${statusBadge}</div>
        </div>

        <div class="item-title">${this.escapeHtml(ex.exam_name)}</div>

        <div class="item-meta-grid">
          <div class="item-meta-item">
            📅 Realização: <strong>${ex.exam_date ? this.formatDate(ex.exam_date) : 'A agendar'}</strong>
          </div>
          <div class="item-meta-item">
            ⏰ Horário: <strong>${ex.exam_time ? ex.exam_time.substring(0, 5) : '--:--'}</strong>
          </div>
          <div class="item-meta-item">
            📍 Cidade: <strong>${this.escapeHtml(ex.city || 'A definir')}</strong>
          </div>
          <div class="item-meta-item">
            🏢 Local: ${this.escapeHtml(ex.location_name || 'Laboratório / Clínica')}
          </div>
        </div>

        <!-- Vínculo com a Consulta de Retorno -->
        <div class="bring-to-appointment-box" style="${ex.status === 'pronto_levar' ? 'background:#ecfdf5; border-color:#86efac; color:#065f46;' : ''}">
          <span>🎯</span>
          <div>
            ${ex.target_appointment_id ? `
              <span>Levar no retorno com: <strong>${this.escapeHtml(ex.target_doctor_name || ex.target_specialty)}</strong> em <strong>${this.formatDate(ex.target_appointment_date)}</strong></span>
            ` : `
              <span style="color:#64748b;">Nenhuma consulta de retorno vinculada. <a href="javascript:void(0)" onclick="App.editExam(${ex.id})" style="color:var(--primary-teal); font-weight:800;">Vincular</a></span>
            `}
          </div>
        </div>

        ${ex.result_notes ? `
          <div style="font-size:0.8rem; color:var(--text-secondary); background:#f8fafc; padding:0.4rem 0.6rem; border-radius:var(--radius-sm); margin:0.4rem 0;">
            📝 <em>${this.escapeHtml(ex.result_notes)}</em>
          </div>
        ` : ''}

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.6rem; padding-top:0.6rem; border-top:1px solid #f1f5f9; gap:0.4rem; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:0.35rem;">
            <label style="font-size:0.75rem; font-weight:800; color:var(--text-muted);">Status:</label>
            <select class="form-control" style="width:auto; padding:0.25rem 0.5rem; font-size:0.78rem;" onchange="App.updateExamStatus(${ex.id}, this.value)">
              <option value="a_agendar" ${ex.status === 'a_agendar' ? 'selected' : ''}>A Agendar</option>
              <option value="agendado" ${ex.status === 'agendado' ? 'selected' : ''}>Agendado</option>
              <option value="feito_aguardando" ${ex.status === 'feito_aguardando' ? 'selected' : ''}>Aguardando Resultado</option>
              <option value="pronto_levar" ${ex.status === 'pronto_levar' ? 'selected' : ''}>Pronto p/ Levar</option>
              <option value="concluido" ${ex.status === 'concluido' ? 'selected' : ''}>Concluído</option>
            </select>
          </div>

          <div style="display:flex; gap:0.35rem;">
            <button class="btn btn-sm btn-secondary" onclick="App.editExam(${ex.id})">Editar</button>
            <button class="btn btn-sm btn-secondary" style="color:var(--danger);" onclick="App.deleteExam(${ex.id})">Excluir</button>
          </div>
        </div>
      </div>
    `;
  },

  /* =========================================================================
     ABA 4: EXAMES (REDIRECIONA PARA AGENDA COM FILTRO DE EXAMES)
     ========================================================================= */
  renderExamesTab(container) {
    this.state.selectedCategoryFilter = 'exame';
    this.renderConsultasTab(container);
  },

  /* =========================================================================
     ABA 5: REMÉDIOS (ESTILO INVENTÁRIO COM STATUS PÍLULA)
     ========================================================================= */
  renderRemediosTab(container) {
    const q = this.state.searchQuery;
    const medFilter = this.state.selectedMedFilter;
    const personFilter = this.state.selectedFamilyFilter;

    let list = this.state.medications.filter(m => {
      if (personFilter !== 'all' && m.person_id != personFilter) {
        return false;
      }
      if (medFilter === 'comprar' && m.needs_purchase != 1) {
        return false;
      }
      if (medFilter === 'em_dia' && m.needs_purchase != 0) {
        return false;
      }
      if (q) {
        const str = `${m.name || ''} ${m.dosage || ''} ${m.preferred_city || ''} ${m.instructions || ''} ${m.person_name || ''} ${m.notes || ''}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });

    const needsPurchase = list.filter(m => m.needs_purchase == 1);
    const stockOk = list.filter(m => m.needs_purchase == 0);

    let html = `
      <div class="subnav-segmented">
        <button class="subnav-pill active" onclick="App.switchTab('remedios')">
          💊 Farmácia e Remédios (${this.state.medications.length})
        </button>
        <button class="subnav-pill" onclick="App.switchTab('familiares')">
          👥 Familiares (${this.state.persons.length})
        </button>
      </div>

      ${this.getSearchBarHtml('Buscar remédio, dosagem, cidade...')}

      ${this.getMedPillsHtml()}

      ${this.getFilterSelectHtml()}

      <div class="action-bar">
        <div class="action-bar-title">
          <span>💊 Remédios da Família</span>
          ${needsPurchase.length > 0 ? `<span class="status-pill status-a-agendar">⚠️ ${needsPurchase.length} a comprar</span>` : ''}
        </div>
        <button class="btn btn-sm btn-primary" onclick="App.openModal('modal-medication')">
          <span>+ Cadastrar</span>
        </button>
      </div>

      <div id="remedios-list-container">
        ${this.getRemediosListHtml(list, medFilter, q)}
      </div>
    `;

    container.innerHTML = html;
  },

  getRemediosListHtml(list, medFilter, q) {
    const needsPurchase = list.filter(m => m.needs_purchase == 1);
    const stockOk = list.filter(m => m.needs_purchase == 0);

    if (list.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">💊</div>
          <h3>${q ? 'Nenhum remédio encontrado' : 'Nenhum remédio cadastrado'}</h3>
          <p>Cadastre os remédios e marque quando precisar comprar na farmácia.</p>
        </div>
      `;
    }

    let html = '';
    if (needsPurchase.length > 0 && (medFilter === 'all' || medFilter === 'comprar')) {
      html += `
        <div style="margin-bottom:1.25rem;">
          <h3 style="font-size:0.95rem; font-weight:800; color:var(--accent-orange); margin-bottom:0.5rem; display:flex; align-items:center; gap:0.4rem;">
            <span>🛒</span> Falta Comprar (${needsPurchase.length})
          </h3>
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            ${needsPurchase.map(m => this.getMedicationRowHtml(m)).join('')}
          </div>
        </div>
      `;
    }

    if (stockOk.length > 0 && (medFilter === 'all' || medFilter === 'em_dia')) {
      html += `
        <div>
          <h3 style="font-size:0.95rem; font-weight:800; color:var(--text-title); margin-bottom:0.5rem; display:flex; align-items:center; gap:0.4rem;">
            <span>✅</span> Em Estoque / Em Dia (${stockOk.length})
          </h3>
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            ${stockOk.map(m => this.getMedicationRowHtml(m)).join('')}
          </div>
        </div>
      `;
    }
    return html;
  },

  updateRemediosListOnly() {
    const listEl = document.getElementById('remedios-list-container');
    if (!listEl) {
      this.renderCurrentTab();
      return;
    }
    const q = (this.state.searchQuery || '').trim().toLowerCase();
    const medFilter = this.state.selectedMedFilter;
    const personFilter = this.state.selectedFamilyFilter;

    let list = this.state.medications.filter(m => {
      if (personFilter !== 'all' && m.person_id != personFilter) return false;
      if (medFilter === 'comprar' && m.needs_purchase != 1) return false;
      if (medFilter === 'em_dia' && m.needs_purchase != 0) return false;
      if (q) {
        const str = `${m.name || ''} ${m.dosage || ''} ${m.preferred_city || ''} ${m.instructions || ''} ${m.person_name || ''} ${m.notes || ''}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });

    listEl.innerHTML = this.getRemediosListHtml(list, medFilter, q);
  },

  getMedicationRowHtml(m) {
    const isBuy = m.needs_purchase == 1;
    return `
      <div class="med-row ${isBuy ? 'needs-purchase' : ''}">
        <div class="med-info">
          <h4>
            <span class="person-badge" style="background-color: ${m.person_color};">
              👤 ${this.escapeHtml(m.person_name)}
            </span>
            <span>${this.escapeHtml(m.name)}</span>
            <span style="font-size:0.75rem; font-weight:500; color:var(--text-muted);">(${this.escapeHtml(m.dosage || 'Dosagem padrão')})</span>
          </h4>
          <div class="med-details">
            ⏰ <em>${this.escapeHtml(m.instructions || 'Conforme receita')}</em>
            ${m.preferred_city ? ` • 📍 Comprar em: <strong>${this.escapeHtml(m.preferred_city)}</strong>` : ''}
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; align-items:center; gap:0.4rem;">
          <button class="btn btn-sm ${isBuy ? 'btn-success' : 'btn-secondary'}" onclick="App.toggleMedPurchase(${m.id}, ${isBuy ? 0 : 1})">
            ${isBuy ? '✓ Já Comprei' : '🛒 Preciso Comprar'}
          </button>
          <button class="btn btn-sm btn-secondary" onclick="App.editMedication(${m.id})">Editar</button>
          <button class="btn btn-sm btn-secondary" style="color:var(--danger);" onclick="App.deleteMedication(${m.id})">Excluir</button>
        </div>
      </div>
    `;
  },

  /* =========================================================================
     ABA 6: PESSOAS CADASTRADAS (SOMENTE AS 6 FIXAS, SEM BOTÃO DE CADASTRO)
     ========================================================================= */
  renderPessoasTab(container) {
    let html = `
      <div class="subnav-segmented">
        <button class="subnav-pill" onclick="App.switchTab('remedios')">
          💊 Farmácia e Remédios (${this.state.medications.length})
        </button>
        <button class="subnav-pill active" onclick="App.switchTab('familiares')">
          👥 Familiares (${this.state.persons.length})
        </button>
      </div>

      <div class="action-bar">
        <div class="action-bar-title">
          <span>👥 As 6 Pessoas da Família</span>
        </div>
        <button class="btn btn-sm btn-secondary" onclick="App.exportBackup()">
          <span>💾 Backup</span>
        </button>
      </div>

      <div style="display:grid; grid-template-columns:1fr; gap:0.75rem;">
    `;

    this.state.persons.forEach(p => {
      const pApps = this.state.appointments.filter(a => a.person_id == p.id);
      const pExams = this.state.exams.filter(e => e.person_id == p.id);
      const pMeds = this.state.medications.filter(m => m.person_id == p.id);

      html += `
        <div class="item-card" style="border-left: 5px solid ${p.color};">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <div style="width:34px; height:34px; border-radius:50%; background-color:${p.color}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:1.05rem;">
                ${p.name.charAt(0)}
              </div>
              <h4 style="font-size:1.1rem; font-weight:800; color:var(--text-main); margin:0;">
                ${this.escapeHtml(p.name)}
              </h4>
            </div>

            <button class="btn btn-sm btn-outline-primary" onclick="App.filterAndGo('${p.id}')">
              Ver Agenda
            </button>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.4rem; text-align:center; background:#f8fafc; padding:0.5rem; border-radius:var(--radius-sm); font-size:0.78rem;">
            <div>
              <strong style="display:block; font-size:1rem; color:var(--text-main);">${pApps.length}</strong>
              <span style="color:var(--text-muted);">Consultas</span>
            </div>
            <div>
              <strong style="display:block; font-size:1rem; color:var(--text-main);">${pExams.length}</strong>
              <span style="color:var(--text-muted);">Exames</span>
            </div>
            <div>
              <strong style="display:block; font-size:1rem; color:var(--text-main);">${pMeds.length}</strong>
              <span style="color:var(--text-muted);">Remédios</span>
            </div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  },

  filterAndGo(personId) {
    this.state.selectedFamilyFilter = personId;
    this.switchTab('consultas');
  },

  /* =========================================================================
     POPULAR SELECTS E HELPERS
     ========================================================================= */
  populatePersonSelects() {
    const selects = ['app-person-id', 'exam-person-id', 'med-person-id'];
    selects.forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.innerHTML = '<option value="">Selecione...</option>';
      this.state.persons.forEach(p => {
        sel.innerHTML += `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`;
      });
    });
  },

  populateAppointmentSelects() {
    const sel = document.getElementById('exam-target-appointment-id');
    if (!sel) return;
    sel.innerHTML = '<option value="">Nenhuma / A definir depois</option>';
    this.state.appointments.forEach(a => {
      sel.innerHTML += `
        <option value="${a.id}">
          ${this.formatDate(a.appointment_date)} • ${this.escapeHtml(a.person_name)} • ${this.escapeHtml(a.specialty)} (${this.escapeHtml(a.city)})
        </option>
      `;
    });
  },

  selectCommitmentCategory(cat = 'saude') {
    document.querySelectorAll('.category-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === cat);
    });

    const modalTitle = document.getElementById('modal-app-title');
    const specialtyLabel = document.getElementById('app-specialty-label');
    const specialtyInput = document.getElementById('app-specialty');
    const doctorLabel = document.getElementById('app-doctor-label');
    const doctorInput = document.getElementById('app-doctor');
    const locationLabel = document.getElementById('app-location-label');
    const locationInput = document.getElementById('app-location');

    if (cat === 'inss') {
      if (modalTitle) modalTitle.textContent = '🏛️ Compromisso no INSS / Previdência';
      if (specialtyLabel) specialtyLabel.innerHTML = 'Motivo / Serviço no INSS <span class="req">*</span>';
      if (specialtyInput) specialtyInput.placeholder = 'Ex: Prova de vida, Perícia médica, Agendamento';
      if (doctorLabel) doctorLabel.textContent = 'Perito / Atendente (Opcional)';
      if (doctorInput) doctorInput.placeholder = 'Ex: Perícia com Dr. Marcos';
      if (locationLabel) locationLabel.textContent = 'Posto / Agência do INSS';
      if (locationInput) locationInput.placeholder = 'Ex: Agência INSS Centro';
    } else if (cat === 'banco') {
      if (modalTitle) modalTitle.textContent = '🏦 Compromisso no Banco / Pagamento';
      if (specialtyLabel) specialtyLabel.innerHTML = 'Assunto no Banco <span class="req">*</span>';
      if (specialtyInput) specialtyInput.placeholder = 'Ex: Saque de benefício, Prova de vida, Cartão';
      if (doctorLabel) doctorLabel.textContent = 'Gerente / Caixa (Opcional)';
      if (doctorInput) doctorInput.placeholder = 'Ex: Gerente Carlos, Caixa 02';
      if (locationLabel) locationLabel.textContent = 'Banco / Agência';
      if (locationInput) locationInput.placeholder = 'Ex: Banco do Brasil, Bradesco, Caixa Econômica';
    } else if (cat === 'outro') {
      if (modalTitle) modalTitle.textContent = '📋 Outro Compromisso / Necessidade';
      if (specialtyLabel) specialtyLabel.innerHTML = 'Descrição do Compromisso <span class="req">*</span>';
      if (specialtyInput) specialtyInput.placeholder = 'Ex: Cartório de Notas, Mercado, Documentos';
      if (doctorLabel) doctorLabel.textContent = 'Contato / Responsável (Opcional)';
      if (doctorInput) doctorInput.placeholder = 'Ex: Tabelião, Atendente';
      if (locationLabel) locationLabel.textContent = 'Local / Estabelecimento';
      if (locationInput) locationInput.placeholder = 'Ex: Cartório Central, Poupatempo';
    } else {
      if (modalTitle) modalTitle.textContent = '🩺 Agendar Consulta Médica';
      if (specialtyLabel) specialtyLabel.innerHTML = 'Especialidade Médica <span class="req">*</span>';
      if (specialtyInput) specialtyInput.placeholder = 'Ex: Cardiologia, Oftalmo, Geriatra, Clínico';
      if (doctorLabel) doctorLabel.textContent = 'Nome do Médico';
      if (doctorInput) doctorInput.placeholder = 'Ex: Dr. Roberto Mendes';
      if (locationLabel) locationLabel.textContent = 'Clínica / Hospital';
      if (locationInput) locationInput.placeholder = 'Ex: Santa Casa, Hospital Vera Cruz';
    }
  },

  openModal(modalId, options = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (modalId === 'modal-appointment') {
      const cat = options.category || 'saude';
      this.selectCommitmentCategory(cat);
      if (!options.isEdit) {
        document.getElementById('form-appointment').reset();
        document.getElementById('app-id').value = '';
      }
    }
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) modalBody.scrollTop = 0;
  },

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    document.body.classList.remove('modal-open');
  },

  openNewSheet() {
    this.openModal('modal-quick-new');
  },

  // Consulta
  async saveAppointmentForm(e) {
    e.preventDefault();
    const id = document.getElementById('app-id').value;
    const data = {
      id: id ? parseInt(id, 10) : (this.useLocalDB ? Date.now() : null),
      person_id: parseInt(document.getElementById('app-person-id').value, 10),
      specialty: document.getElementById('app-specialty').value.trim(),
      doctor_name: document.getElementById('app-doctor').value.trim(),
      city: document.getElementById('app-city').value.trim(),
      location_name: document.getElementById('app-location').value.trim(),
      appointment_date: document.getElementById('app-date').value,
      appointment_time: document.getElementById('app-time').value,
      status: 'agendada',
      notes: document.getElementById('app-notes').value.trim()
    };

    if (!data.person_id || !data.specialty || !data.city || !data.appointment_date) {
      this.showToast('Preencha os campos obrigatórios.', 'danger');
      return;
    }

    if (this.useLocalDB) {
      const db = this.localDB.get();
      const idx = db.appointments.findIndex(a => a.id == data.id);
      if (idx >= 0) db.appointments[idx] = data;
      else db.appointments.push(data);
      this.localDB.save(db);
      this.closeAllModals();
      this.showToast('Consulta salva!', 'success');
      document.getElementById('form-appointment').reset();
      document.getElementById('app-id').value = '';
      await this.loadData();
      return;
    }

    try {
      const res = await fetch(this.apiUrl('save_appointment'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.success) {
        this.closeAllModals();
        this.showToast('Consulta salva!', 'success');
        document.getElementById('form-appointment').reset();
        document.getElementById('app-id').value = '';
        await this.loadData();
      } else {
        this.showToast(result.error || 'Erro ao salvar.', 'danger');
      }
    } catch (err) {
      this.showToast('Erro de comunicação.', 'danger');
    }
  },

  editAppointment(id) {
    const app = this.state.appointments.find(a => a.id == id);
    if (!app) return;
    const specLower = (app.specialty || '').toLowerCase();
    let cat = 'saude';
    if (specLower.includes('inss') || specLower.includes('previd') || specLower.includes('perícia')) {
      cat = 'inss';
    } else if (specLower.includes('banco') || specLower.includes('benefício') || specLower.includes('pagamento') || specLower.includes('saque')) {
      cat = 'banco';
    } else if (specLower.includes('cartório') || specLower.includes('documento') || specLower.includes('mercado')) {
      cat = 'outro';
    }
    this.openModal('modal-appointment', { isEdit: true, category: cat });
    document.getElementById('app-id').value = app.id;
    document.getElementById('app-person-id').value = app.person_id;
    document.getElementById('app-specialty').value = app.specialty;
    document.getElementById('app-doctor').value = app.doctor_name || '';
    document.getElementById('app-city').value = app.city;
    document.getElementById('app-location').value = app.location_name || '';
    document.getElementById('app-date').value = app.appointment_date;
    document.getElementById('app-time').value = app.appointment_time || '';
    document.getElementById('app-notes').value = app.notes || '';
  },

  async deleteAppointment(id) {
    if (!confirm('Deseja excluir esta consulta?')) return;
    if (this.useLocalDB) {
      const db = this.localDB.get();
      db.appointments = db.appointments.filter(a => a.id != id);
      this.localDB.save(db);
      this.showToast('Consulta excluída.', 'success');
      await this.loadData();
      return;
    }
    await fetch(this.apiUrl('delete_appointment'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    this.showToast('Consulta excluída.', 'success');
    await this.loadData();
  },

  async toggleAppointmentStatus(id, newStatus) {
    if (this.useLocalDB) {
      const db = this.localDB.get();
      const app = db.appointments.find(a => a.id == id);
      if (app) app.status = newStatus;
      this.localDB.save(db);
      this.showToast('Status atualizado!', 'success');
      await this.loadData();
      return;
    }
    await fetch(this.apiUrl('update_appointment_status'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus })
    });
    this.showToast('Status da consulta atualizado!', 'success');
    await this.loadData();
  },

  addExamForAppointment(appId, personId) {
    document.getElementById('form-exam').reset();
    document.getElementById('exam-id').value = '';
    document.getElementById('exam-person-id').value = personId;
    document.getElementById('exam-target-appointment-id').value = appId;
    this.openModal('modal-exam');
  },

  // Exame
  async saveExamForm(e) {
    e.preventDefault();
    const id = document.getElementById('exam-id').value;
    const data = {
      id: id ? parseInt(id, 10) : (this.useLocalDB ? Date.now() : null),
      person_id: parseInt(document.getElementById('exam-person-id').value, 10),
      exam_name: document.getElementById('exam-name').value.trim(),
      target_appointment_id: document.getElementById('exam-target-appointment-id').value ? parseInt(document.getElementById('exam-target-appointment-id').value, 10) : null,
      exam_date: document.getElementById('exam-date').value || null,
      exam_time: document.getElementById('exam-time').value || null,
      city: document.getElementById('exam-city').value.trim(),
      location_name: document.getElementById('exam-location').value.trim(),
      status: document.getElementById('exam-status').value,
      result_notes: document.getElementById('exam-notes').value.trim()
    };

    if (!data.person_id || !data.exam_name) {
      this.showToast('Preencha a pessoa e o exame.', 'danger');
      return;
    }

    if (this.useLocalDB) {
      const db = this.localDB.get();
      const idx = db.exams.findIndex(item => item.id == data.id);
      if (idx >= 0) db.exams[idx] = data;
      else db.exams.push(data);
      this.localDB.save(db);
      this.closeAllModals();
      this.showToast('Exame salvo!', 'success');
      document.getElementById('form-exam').reset();
      document.getElementById('exam-id').value = '';
      await this.loadData();
      return;
    }

    try {
      const res = await fetch(this.apiUrl('save_exam'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.success) {
        this.closeAllModals();
        this.showToast('Exame salvo!', 'success');
        document.getElementById('form-exam').reset();
        document.getElementById('exam-id').value = '';
        await this.loadData();
      }
    } catch (err) {
      this.showToast('Erro de comunicação.', 'danger');
    }
  },

  editExam(id) {
    const ex = this.state.exams.find(e => e.id == id);
    if (!ex) return;
    document.getElementById('exam-id').value = ex.id;
    document.getElementById('exam-person-id').value = ex.person_id;
    document.getElementById('exam-name').value = ex.exam_name;
    document.getElementById('exam-target-appointment-id').value = ex.target_appointment_id || '';
    document.getElementById('exam-date').value = ex.exam_date || '';
    document.getElementById('exam-time').value = ex.exam_time || '';
    document.getElementById('exam-city').value = ex.city || '';
    document.getElementById('exam-location').value = ex.location_name || '';
    document.getElementById('exam-status').value = ex.status || 'a_agendar';
    document.getElementById('exam-notes').value = ex.result_notes || '';
    this.openModal('modal-exam');
  },

  async updateExamStatus(id, newStatus) {
    if (this.useLocalDB) {
      const db = this.localDB.get();
      const ex = db.exams.find(e => e.id == id);
      if (ex) ex.status = newStatus;
      this.localDB.save(db);
      this.showToast('Status atualizado!', 'success');
      await this.loadData();
      return;
    }
    await fetch(this.apiUrl('update_exam_status'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus })
    });
    this.showToast('Status atualizado!', 'success');
    await this.loadData();
  },

  async markExamDone(id) {
    await this.updateExamStatus(id, 'concluido');
  },

  async deleteExam(id) {
    if (!confirm('Deseja excluir este exame?')) return;
    if (this.useLocalDB) {
      const db = this.localDB.get();
      db.exams = db.exams.filter(e => e.id != id);
      this.localDB.save(db);
      this.showToast('Exame excluído.', 'success');
      await this.loadData();
      return;
    }
    await fetch(this.apiUrl('delete_exam'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    this.showToast('Exame excluído.', 'success');
    await this.loadData();
  },

  // Remédios
  async saveMedicationForm(e) {
    e.preventDefault();
    const id = document.getElementById('med-id').value;
    const data = {
      id: id ? parseInt(id, 10) : (this.useLocalDB ? Date.now() : null),
      person_id: parseInt(document.getElementById('med-person-id').value, 10),
      name: document.getElementById('med-name').value.trim(),
      dosage: document.getElementById('med-dosage').value.trim(),
      instructions: document.getElementById('med-instructions').value.trim(),
      preferred_city: document.getElementById('med-city').value.trim(),
      needs_purchase: document.getElementById('med-needs-purchase').checked ? 1 : 0,
      notes: document.getElementById('med-notes').value.trim()
    };

    if (!data.person_id || !data.name) {
      this.showToast('Preencha a pessoa e o remédio.', 'danger');
      return;
    }

    if (this.useLocalDB) {
      const db = this.localDB.get();
      const idx = db.medications.findIndex(m => m.id == data.id);
      if (idx >= 0) db.medications[idx] = data;
      else db.medications.push(data);
      this.localDB.save(db);
      this.closeAllModals();
      this.showToast('Remédio salvo!', 'success');
      document.getElementById('form-medication').reset();
      document.getElementById('med-id').value = '';
      await this.loadData();
      return;
    }

    try {
      const res = await fetch(this.apiUrl('save_medication'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.success) {
        this.closeAllModals();
        this.showToast('Remédio salvo!', 'success');
        document.getElementById('form-medication').reset();
        document.getElementById('med-id').value = '';
        await this.loadData();
      }
    } catch (err) {
      this.showToast('Erro ao salvar remédio.', 'danger');
    }
  },

  editMedication(id) {
    const m = this.state.medications.find(item => item.id == id);
    if (!m) return;
    document.getElementById('med-id').value = m.id;
    document.getElementById('med-person-id').value = m.person_id;
    document.getElementById('med-name').value = m.name;
    document.getElementById('med-dosage').value = m.dosage || '';
    document.getElementById('med-instructions').value = m.instructions || '';
    document.getElementById('med-city').value = m.preferred_city || '';
    document.getElementById('med-needs-purchase').checked = m.needs_purchase == 1;
    document.getElementById('med-notes').value = m.notes || '';
    this.openModal('modal-medication');
  },

  async toggleMedPurchase(id, needs) {
    if (this.useLocalDB) {
      const db = this.localDB.get();
      const m = db.medications.find(item => item.id == id);
      if (m) m.needs_purchase = needs;
      this.localDB.save(db);
      this.showToast(needs ? 'Marcado para comprar!' : 'Remédio marcado como comprado.', 'success');
      await this.loadData();
      return;
    }
    await fetch(this.apiUrl('toggle_medication_purchase'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, needs_purchase: needs })
    });
    this.showToast(needs ? 'Marcado para comprar!' : 'Remédio marcado como comprado.', 'success');
    await this.loadData();
  },

  async deleteMedication(id) {
    if (!confirm('Deseja excluir este remédio?')) return;
    if (this.useLocalDB) {
      const db = this.localDB.get();
      db.medications = db.medications.filter(m => m.id != id);
      this.localDB.save(db);
      this.showToast('Remédio excluído.', 'success');
      await this.loadData();
      return;
    }
    await fetch(this.apiUrl('delete_medication'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    this.showToast('Remédio excluído.', 'success');
    await this.loadData();
  },

  exportBackup() {
    let backupData = {};
    if (this.useLocalDB) {
      backupData = this.localDB.get();
      backupData.exported_at = new Date().toISOString();
    } else {
      window.location.href = this.apiUrl('export_backup');
      return;
    }

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_familia_em_dia_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Backup baixado!', 'success');
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  showToast(msg, type = 'info') {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = 'toast show';
    setTimeout(() => {
      toast.className = 'toast';
    }, 3200);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
