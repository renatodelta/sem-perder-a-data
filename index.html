<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Sem Perder a Data - Saúde & Logística</title>
  <meta name="description" content="Aplicativo da Ednéia para organização de consultas, exames vinculados a retornos, remédios e caronas da família.">
  
  <!-- Configurações PWA (Instalável no Celular) -->
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#133834">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="Sem Perder a Data">
  <link rel="apple-touch-icon" href="assets/icons/icon-192.png">
  <link rel="icon" type="image/png" sizes="192x192" href="assets/icons/icon-192.png">
  
  <!-- Tipografia Moderna -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  
  <!-- Estilos Mobile-First -->
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

  <!-- CABEÇALHO SUPERIOR MODERNO (INSPIRADO NO DESIGN DE REFERÊNCIA) -->
  <header class="header-app">
    <div class="header-container">
      <div class="greeting-box">
        <span class="greeting-badge">Olá, Ednéia 👋</span>
        <h1 class="greeting-title">Sem Perder <span class="highlight-text">a Data</span></h1>
      </div>
      
      <div class="header-actions">
        <!-- Botão de Instalar no Celular PWA -->
        <button class="btn-header-icon btn-install-pwa" onclick="App.promptInstall()" style="display:none;" title="Instalar Aplicativo no Celular">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>

        <!-- Botão Rápido de Familiares -->
        <button class="btn-header-pill" onclick="App.switchTab('familiares')" title="Gerenciar Familiares">
          <span class="pill-dot"></span>
          <span>👥 Familiares</span>
        </button>
      </div>
    </div>
  </header>

  <!-- ÁREA DE CONTEÚDO PRINCIPAL (COM ESPAÇO PARA A BARRA FLUTUANTE) -->
  <main class="main-wrapper">
    <div id="tab-content-area">
      <!-- O conteúdo será injetado dinamicamente pelo app.js -->
    </div>
  </main>

  <!-- =========================================================================
       MENU INFERIOR FLUTUANTE (BOTTOM NAVIGATION BAR)
       Com 4 abas + Botão Central Elevado (+) em Dourado Idêntico ao Layout
       ========================================================================= -->
  <nav class="bottom-nav-bar">
    <div class="bottom-nav-container">
      <!-- ABA 1: PAINEL / INÍCIO -->
      <button class="bottom-nav-item active" data-tab="dashboard">
        <div class="nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="3" width="7" height="7" rx="2.5"></rect>
            <rect x="14" y="3" width="7" height="7" rx="2.5"></rect>
            <rect x="3" y="14" width="7" height="7" rx="2.5"></rect>
            <rect x="14" y="14" width="7" height="7" rx="2.5"></rect>
          </svg>
        </div>
        <span class="nav-text">Painel</span>
        <span class="active-dot"></span>
      </button>

      <!-- ABA 2: VIAGENS / CARONAS -->
      <button class="bottom-nav-item" data-tab="logistica">
        <div class="nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path>
            <circle cx="7" cy="17" r="2"></circle>
            <path d="M9 17h6"></path>
            <circle cx="17" cy="17" r="2"></circle>
          </svg>
          <span class="nav-badge-pill" id="badge-bottom-trips" style="display:none;">0</span>
        </div>
        <span class="nav-text">Viagens</span>
        <span class="active-dot"></span>
      </button>

      <!-- BOTÃO CENTRAL ELEVADO FAB (+) EM DOURADO/AMBER -->
      <div class="bottom-nav-fab-wrapper">
        <button class="bottom-nav-fab" onclick="App.openNewSheet()" aria-label="Adicionar Novo Agendamento" title="Novo Agendamento">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      <!-- ABA 3: CONSULTAS & EXAMES -->
      <button class="bottom-nav-item" data-tab="consultas">
        <div class="nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          <span class="nav-badge-pill" id="badge-bottom-consultas" style="display:none;">0</span>
        </div>
        <span class="nav-text">Consultas</span>
        <span class="active-dot"></span>
      </button>

      <!-- ABA 4: REMÉDIOS & FAMÍLIA -->
      <button class="bottom-nav-item" data-tab="remedios">
        <div class="nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span class="nav-badge-pill" id="badge-bottom-remedios" style="display:none;">0</span>
        </div>
        <span class="nav-text">Remédios</span>
        <span class="active-dot"></span>
      </button>
    </div>
  </nav>

  <!-- =========================================================================
       BOTTOM SHEET RÁPIDO: "+ NOVO"
       ========================================================================= -->
  <div class="modal-overlay" id="modal-quick-new">
    <div class="modal-dialog">
      <div class="modal-header">
        <h3>O que você deseja agendar?</h3>
        <button class="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <div class="sheet-options">
          <div class="sheet-option-btn" onclick="App.closeAllModals(); App.openModal('modal-appointment')">
            <div class="sheet-option-icon">🩺</div>
            <div class="sheet-option-text">
              <h4>Nova Consulta Médica</h4>
              <p>Marcar especialidade, médico, data, hora e cidade</p>
            </div>
          </div>

          <div class="sheet-option-btn" onclick="App.closeAllModals(); App.openModal('modal-exam')">
            <div class="sheet-option-icon">🔬</div>
            <div class="sheet-option-text">
              <h4>Novo Pedido de Exame</h4>
              <p>Anotar exame solicitado e vincular à consulta de retorno</p>
            </div>
          </div>

          <div class="sheet-option-btn" onclick="App.closeAllModals(); App.openModal('modal-medication')">
            <div class="sheet-option-icon">💊</div>
            <div class="sheet-option-text">
              <h4>Novo Remédio</h4>
              <p>Adicionar remédio e colocar na lista de compras da farmácia</p>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary btn-cancel-modal" style="width:100%;">Fechar</button>
      </div>
    </div>
  </div>

  <!-- =========================================================================
       MODAL 1: CONSULTA MÉDICA
       ========================================================================= -->
  <div class="modal-overlay" id="modal-appointment">
    <div class="modal-dialog">
      <div class="modal-header">
        <h3 id="modal-app-title">Agendar Consulta Médica</h3>
        <button class="modal-close-btn">&times;</button>
      </div>
      <form id="form-appointment" onsubmit="App.saveAppointmentForm(event)">
        <input type="hidden" id="app-id">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Para quem é a consulta? <span class="req">*</span></label>
            <select id="app-person-id" class="form-control" required></select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Especialidade <span class="req">*</span></label>
              <input type="text" id="app-specialty" class="form-control" placeholder="Ex: Cardiologia, Oftalmo" required>
            </div>
            <div class="form-group">
              <label class="form-label">Nome do Médico</label>
              <input type="text" id="app-doctor" class="form-control" placeholder="Ex: Dr. Roberto">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Cidade <span class="req">*</span></label>
              <input type="text" id="app-city" class="form-control" placeholder="Ex: Campinas" required>
            </div>
            <div class="form-group">
              <label class="form-label">Clínica / Hospital</label>
              <input type="text" id="app-location" class="form-control" placeholder="Ex: Vera Cruz">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Data da Consulta <span class="req">*</span></label>
              <input type="date" id="app-date" class="form-control" required>
            </div>
            <div class="form-group">
              <label class="form-label">Horário</label>
              <input type="time" id="app-time" class="form-control">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Anotações / Instruções</label>
            <textarea id="app-notes" class="form-control" placeholder="Ex: Levar exames anteriores..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-cancel-modal">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar Consulta</button>
        </div>
      </form>
    </div>
  </div>

  <!-- =========================================================================
       MODAL 2: EXAME MÉDICO
       ========================================================================= -->
  <div class="modal-overlay" id="modal-exam">
    <div class="modal-dialog">
      <div class="modal-header">
        <h3 id="modal-exam-title">Pedido de Exame Médico</h3>
        <button class="modal-close-btn">&times;</button>
      </div>
      <form id="form-exam" onsubmit="App.saveExamForm(event)">
        <input type="hidden" id="exam-id">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">De quem é o exame? <span class="req">*</span></label>
            <select id="exam-person-id" class="form-control" required></select>
          </div>

          <div class="form-group">
            <label class="form-label">Nome do Exame <span class="req">*</span></label>
            <input type="text" id="exam-name" class="form-control" placeholder="Ex: Hemograma, Ecocardiograma" required>
          </div>

          <div class="form-group" style="background:#eff6ff; padding:0.75rem; border-radius:var(--radius-md); border:1px solid #bfdbfe;">
            <label class="form-label" style="color:#1e3a8a;">🎯 Em qual Consulta de Retorno levar o resultado?</label>
            <select id="exam-target-appointment-id" class="form-control"></select>
            <small style="color:#3b82f6; display:block; margin-top:3px;">
              Assim que o laudo estiver pronto, ele aparecerá na data desta consulta!
            </small>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Status do Exame</label>
              <select id="exam-status" class="form-control">
                <option value="a_agendar">🟡 Precisa Agendar (A Agendar)</option>
                <option value="agendado">🔵 Agendado (Com data marcada)</option>
                <option value="feito_aguardando">🟣 Feito (Aguardando resultado)</option>
                <option value="pronto_levar">🟢 PRONTO P/ LEVAR NO RETORNO!</option>
                <option value="concluido">⚪ Concluído</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Data de Realização</label>
              <input type="date" id="exam-date" class="form-control">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Horário</label>
              <input type="time" id="exam-time" class="form-control">
            </div>
            <div class="form-group">
              <label class="form-label">Cidade</label>
              <input type="text" id="exam-city" class="form-control" placeholder="Ex: Campinas">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Laboratório / Clínica</label>
            <input type="text" id="exam-location" class="form-control" placeholder="Ex: Laboratório Pasteur">
          </div>

          <div class="form-group">
            <label class="form-label">Observações</label>
            <textarea id="exam-notes" class="form-control" placeholder="Ex: Jejum de 10h..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-cancel-modal">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar Exame</button>
        </div>
      </form>
    </div>
  </div>

  <!-- =========================================================================
       MODAL 3: REMÉDIO
       ========================================================================= -->
  <div class="modal-overlay" id="modal-medication">
    <div class="modal-dialog">
      <div class="modal-header">
        <h3 id="modal-med-title">Cadastrar Remédio</h3>
        <button class="modal-close-btn">&times;</button>
      </div>
      <form id="form-medication" onsubmit="App.saveMedicationForm(event)">
        <input type="hidden" id="med-id">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Quem toma este remédio? <span class="req">*</span></label>
            <select id="med-person-id" class="form-control" required></select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nome do Remédio <span class="req">*</span></label>
              <input type="text" id="med-name" class="form-control" placeholder="Ex: Losartana, Omeprazol" required>
            </div>
            <div class="form-group">
              <label class="form-label">Dosagem</label>
              <input type="text" id="med-dosage" class="form-control" placeholder="Ex: 50mg">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Como tomar (Instruções)</label>
            <input type="text" id="med-instructions" class="form-control" placeholder="Ex: 1 comprimido pela manhã">
          </div>

          <div class="form-group">
            <label class="form-label">Cidade onde costuma comprar (Opcional)</label>
            <input type="text" id="med-city" class="form-control" placeholder="Ex: Campinas (Farmácia Popular)">
          </div>

          <div class="form-group" style="background:#fef3c7; padding:0.75rem; border-radius:var(--radius-md); border:1px solid #fde68a;">
            <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-weight:800; color:#92400e; font-size:0.9rem;">
              <input type="checkbox" id="med-needs-purchase" style="width:18px; height:18px;">
              <span>🛒 Precisa comprar na próxima saída!</span>
            </label>
          </div>

          <div class="form-group">
            <label class="form-label">Observações adicionais</label>
            <textarea id="med-notes" class="form-control" placeholder="Ex: Caixa com 60 comprimidos..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-cancel-modal">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar Remédio</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Scripts -->
  <script src="assets/js/app.js"></script>
</body>
</html>
