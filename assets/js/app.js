/**
 * Sem Perder a Data - JavaScript da Aplicação
 * Versão Mobile Otimizada com Menu Inferior (Bottom Bar) e Zero Rolagem Lateral
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
    currentTab: 'logistica',
    selectedFamilyFilter: 'all',
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
      if (!data) {
        data = {
          persons: [
            { id: 1, name: 'Ednéia', color: '#8b5cf6' },
            { id: 2, name: 'Mãe', color: '#ec4899' },
            { id: 3, name: 'Edyr', color: '#2563eb' },
            { id: 4, name: 'Carlos Romeu', color: '#059669' },
            { id: 5, name: 'Rogério', color: '#ea580c' },
            { id: 6, name: 'Tia Mariazinha', color: '#0891b2' }
          ],
          appointments: [],
          exams: [],
          medications: []
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
    this.state.currentTab = tabName;
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    this.renderCurrentTab();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      badgeConsultas.textContent = this.state.appointments.length || '';
      badgeConsultas.style.display = this.state.appointments.length > 0 ? 'inline-block' : 'none';
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
     ABA 1: VIAGENS & CARONA
     ========================================================================= */
  renderLogisticaTab(container) {
    const trips = this.state.trips;

    let html = `
      <div class="logistics-hero-banner">
        <div class="banner-tag">🚗 Carona & Economia</div>
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
     ABA 2: PAINEL GERAL
     ========================================================================= */
  renderDashboardTab(container) {
    const s = this.state.summary;
    const today = this.state.currentDate;

    const upcoming = this.state.appointments.filter(a => a.status === 'agendada' && a.appointment_date >= today).slice(0, 5);
    const readyExams = this.state.exams.filter(e => e.status === 'pronto_levar');

    let html = `
      <div class="summary-cards-grid">
        <div class="stat-card" onclick="App.switchTab('consultas')">
          <div class="stat-icon primary">🩺</div>
          <div class="stat-info">
            <div class="stat-number">${s.week_appointments || 0}</div>
            <div class="stat-label">Consultas na Semana</div>
          </div>
        </div>

        <div class="stat-card" onclick="App.switchTab('logistica')">
          <div class="stat-icon purple">🚗</div>
          <div class="stat-info">
            <div class="stat-number">${s.shared_trips_count || 0}</div>
            <div class="stat-label">Caronas / Viagens</div>
          </div>
        </div>

        <div class="stat-card" onclick="App.switchTab('exames')">
          <div class="stat-icon success">🔬</div>
          <div class="stat-info">
            <div class="stat-number">${s.exams_ready_to_bring || 0}</div>
            <div class="stat-label">Exames Prontos</div>
          </div>
        </div>

        <div class="stat-card" onclick="App.switchTab('remedios')">
          <div class="stat-icon warning">💊</div>
          <div class="stat-info">
            <div class="stat-number">${s.meds_to_buy || 0}</div>
            <div class="stat-label">Remédios a Comprar</div>
          </div>
        </div>
      </div>

      ${readyExams.length > 0 ? `
        <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-left:4px solid #10b981; border-radius:var(--radius-md); padding:1rem; margin-bottom:1rem;">
          <h3 style="color:#065f46; font-size:1rem; font-weight:800;">
            ✅ Exames Prontos para Levar!
          </h3>
          <div style="display:flex; flex-direction:column; gap:0.4rem; margin-top:0.5rem;">
            ${readyExams.map(ex => `
              <div style="background:#ffffff; border:1px solid #d1fae5; padding:0.6rem 0.8rem; border-radius:var(--radius-sm); display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <span class="person-badge" style="background-color:${ex.person_color};">${this.escapeHtml(ex.person_name)}</span>
                  <strong style="font-size:0.9rem;">${this.escapeHtml(ex.exam_name)}</strong>
                  <div style="font-size:0.78rem; color:#065f46; margin-top:2px;">
                    🎯 Levar no retorno: <strong>${this.escapeHtml(ex.target_doctor_name || ex.target_specialty || 'Consulta')}</strong> 
                    ${ex.target_appointment_date ? ` em ${this.formatDate(ex.target_appointment_date)}` : ''}
                  </div>
                </div>
                <button class="btn btn-sm btn-secondary" onclick="App.markExamDone(${ex.id})">Entregue</button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="action-bar">
        <div class="action-bar-title">
          <span>📅 Próximas Consultas</span>
        </div>
        <button class="btn btn-sm btn-outline-primary" onclick="App.switchTab('consultas')">Ver Todas</button>
      </div>

      ${upcoming.length === 0 ? `
        <div class="empty-state">
          <p>Nenhuma consulta agendada.</p>
        </div>
      ` : `
        <div style="display:flex; flex-direction:column; gap:0.6rem;">
          ${upcoming.map(app => this.getAppointmentCardHtml(app)).join('')}
        </div>
      `}
    `;

    container.innerHTML = html;
  },

  /* =========================================================================
     ABA 3: CONSULTAS
     ========================================================================= */
  renderConsultasTab(container) {
    let list = this.state.appointments;
    if (this.state.selectedFamilyFilter !== 'all') {
      list = list.filter(a => a.person_id == this.state.selectedFamilyFilter);
    }

    let html = `
      ${this.getFilterSelectHtml()}

      <div class="action-bar">
        <div class="action-bar-title">
          <span>🩺 Consultas Médicas</span>
          <span class="status-pill status-agendado">${list.length}</span>
        </div>
        <button class="btn btn-sm btn-primary" onclick="App.openModal('modal-appointment')">
          <span>+ Agendar</span>
        </button>
      </div>
    `;

    if (list.length === 0) {
      html += `
        <div class="empty-state">
          <div class="empty-state-icon">🩺</div>
          <h3>Nenhuma consulta cadastrada</h3>
          <p>Toque em "+ Agendar" para marcar uma consulta.</p>
        </div>
      `;
    } else {
      html += `<div style="display:flex; flex-direction:column; gap:0.6rem;">`;
      list.forEach(app => {
        html += this.getAppointmentCardHtml(app);
      });
      html += `</div>`;
    }

    container.innerHTML = html;
  },

  getAppointmentCardHtml(app) {
    return `
      <div class="item-card">
        <div class="item-card-header">
          <span class="person-badge" style="background-color: ${app.person_color};">
            👤 ${this.escapeHtml(app.person_name)}
          </span>
          <span class="status-pill ${app.status === 'realizada' ? 'status-concluido' : 'status-agendado'}">
            ${app.status === 'realizada' ? 'Concluída' : 'Agendada'}
          </span>
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
            <div><strong>Atenção:</strong> Levar <strong>${app.exams_to_bring_count} exame(s)</strong> nesta consulta!</div>
          </div>
        ` : ''}

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.6rem; padding-top:0.6rem; border-top:1px solid #f1f5f9; gap:0.4rem; flex-wrap:wrap;">
          <div style="display:flex; gap:0.35rem;">
            <button class="btn btn-sm btn-outline-primary" onclick="App.addExamForAppointment(${app.id}, ${app.person_id})">
              + Exame
            </button>
            <button class="btn btn-sm btn-secondary" onclick="App.toggleAppointmentStatus(${app.id}, '${app.status === 'realizada' ? 'agendada' : 'realizada'}')">
              ${app.status === 'realizada' ? 'Reabrir' : 'Realizada'}
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

  /* =========================================================================
     ABA 4: EXAMES
     ========================================================================= */
  renderExamesTab(container) {
    let list = this.state.exams;
    if (this.state.selectedFamilyFilter !== 'all') {
      list = list.filter(e => e.person_id == this.state.selectedFamilyFilter);
    }

    let html = `
      ${this.getFilterSelectHtml()}

      <div class="action-bar">
        <div class="action-bar-title">
          <span>🔬 Exames & Retornos</span>
          <span class="status-pill status-agendado">${list.length}</span>
        </div>
        <button class="btn btn-sm btn-primary" onclick="App.openModal('modal-exam')">
          <span>+ Novo Exame</span>
        </button>
      </div>
    `;

    if (list.length === 0) {
      html += `
        <div class="empty-state">
          <div class="empty-state-icon">🔬</div>
          <h3>Nenhum exame cadastrado</h3>
          <p>Cadastre os exames pedidos pelos médicos.</p>
        </div>
      `;
    } else {
      html += `<div style="display:flex; flex-direction:column; gap:0.6rem;">`;
      list.forEach(ex => {
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

        html += `
          <div class="item-card">
            <div class="item-card-header">
              <span class="person-badge" style="background-color: ${ex.person_color};">
                👤 ${this.escapeHtml(ex.person_name)}
              </span>
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
                🏢 Local: ${this.escapeHtml(ex.location_name || 'Laboratório')}
              </div>
            </div>

            <!-- Vínculo com a Consulta de Retorno -->
            <div class="bring-to-appointment-box" style="${ex.status === 'pronto_levar' ? 'background:#ecfdf5; border-color:#86efac; color:#065f46;' : ''}">
              <span>🎯</span>
              <div>
                ${ex.target_appointment_id ? `
                  <span>Levar no retorno com: <strong>${this.escapeHtml(ex.target_doctor_name || ex.target_specialty)}</strong> em <strong>${this.formatDate(ex.target_appointment_date)}</strong></span>
                ` : `
                  <span style="color:#64748b;">Nenhuma consulta de retorno vinculada. <a href="javascript:void(0)" onclick="App.editExam(${ex.id})" style="color:var(--primary); font-weight:800;">Vincular</a></span>
                `}
              </div>
            </div>

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
      });
      html += `</div>`;
    }

    container.innerHTML = html;
  },

  /* =========================================================================
     ABA 5: REMÉDIOS
     ========================================================================= */
  renderRemediosTab(container) {
    let list = this.state.medications;
    if (this.state.selectedFamilyFilter !== 'all') {
      list = list.filter(m => m.person_id == this.state.selectedFamilyFilter);
    }

    const needsPurchase = list.filter(m => m.needs_purchase == 1);
    const stockOk = list.filter(m => m.needs_purchase == 0);

    let html = `
      ${this.getFilterSelectHtml()}

      <div class="action-bar">
        <div class="action-bar-title">
          <span>💊 Remédios</span>
          ${needsPurchase.length > 0 ? `<span class="status-pill status-a-agendar">⚠️ ${needsPurchase.length} a comprar</span>` : ''}
        </div>
        <button class="btn btn-sm btn-primary" onclick="App.openModal('modal-medication')">
          <span>+ Cadastrar</span>
        </button>
      </div>
    `;

    if (list.length === 0) {
      html += `
        <div class="empty-state">
          <div class="empty-state-icon">💊</div>
          <h3>Nenhum remédio cadastrado</h3>
          <p>Adicione os remédios de cada pessoa.</p>
        </div>
      `;
    } else {
      if (needsPurchase.length > 0) {
        html += `
          <div style="margin-bottom:1.25rem;">
            <h3 style="font-size:1rem; font-weight:800; color:#b45309; margin-bottom:0.5rem;">
              🛒 Falta Comprar (${needsPurchase.length})
            </h3>
            <div style="display:flex; flex-direction:column; gap:0.5rem;">
              ${needsPurchase.map(m => this.getMedicationRowHtml(m)).join('')}
            </div>
          </div>
        `;
      }

      if (stockOk.length > 0) {
        html += `
          <div>
            <h3 style="font-size:1rem; font-weight:800; color:var(--text-main); margin-bottom:0.5rem;">
              ✅ Em Dia (${stockOk.length})
            </h3>
            <div style="display:flex; flex-direction:column; gap:0.5rem;">
              ${stockOk.map(m => this.getMedicationRowHtml(m)).join('')}
            </div>
          </div>
        `;
      }
    }

    container.innerHTML = html;
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
     POPULAR SELECTS & HELPERS
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

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  },

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
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
    document.getElementById('app-id').value = app.id;
    document.getElementById('app-person-id').value = app.person_id;
    document.getElementById('app-specialty').value = app.specialty;
    document.getElementById('app-doctor').value = app.doctor_name || '';
    document.getElementById('app-city').value = app.city;
    document.getElementById('app-location').value = app.location_name || '';
    document.getElementById('app-date').value = app.appointment_date;
    document.getElementById('app-time').value = app.appointment_time || '';
    document.getElementById('app-notes').value = app.notes || '';
    this.openModal('modal-appointment');
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
    a.download = `backup_sem_perder_a_data_${new Date().toISOString().split('T')[0]}.json`;
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
