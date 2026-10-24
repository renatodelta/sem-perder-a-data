<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Sem Perder a Data - Saúde & Logística</title>
  <meta name="description" content="Aplicativo da Ednéia para organização de consultas, exames vinculados a retornos, remédios e caronas da família.">
  
  <!-- Configurações PWA (Instalável no Celular) -->
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#0d9488">
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

  <!-- CABEÇALHO SUPERIOR COMPACTO -->
  <header class="header-app">
    <div class="header-container">
      <div class="logo-area">
        <div class="logo-icon">🩺</div>
        <div class="logo-text">
          <h1>Sem Perder a Data</h1>
          <p>Painel da Ednéia</p>
        </div>
      </div>
      
      <div class="header-actions">
        <!-- Botão de Instalar no Celular -->
        <button class="btn-header btn-install-pwa" onclick="App.promptInstall()" style="display:none; background:#f59e0b; border-color:#d97706;">
          <span>📲 Instalar</span>
        </button>

        <!-- Botão Rápido de Pessoas -->
        <button class="btn-header" onclick="App.switchTab('familiares')">
          <span>👥 Pessoas</span>
        </button>

        <!-- Botão + Novo -->
        <button class="btn-header" onclick="App.openNewSheet()" style="background:#ffffff; color:var(--primary); font-weight:800;">
          <span>+ Novo</span>
        </button>
      </div>
    </div>
  </header>

  <!-- ÁREA DE CONTEÚDO PRINCIPAL (COM ESPAÇO PARA A BARRA INFERIOR) -->
  <main class="main-wrapper">
    <div id="tab-content-area">
      <!-- O conteúdo será injetado dinamicamente pelo app.js -->
    </div>
  </main>

  <!-- =========================================================================
       MENU INFERIOR FIXO (BOTTOM NAVIGATION BAR)
       Sem rolagem lateral! Todos os 5 botões cabem perfeitamente na tela do celular
       ========================================================================= -->
  <nav class="bottom-nav-bar">
    <div class="bottom-nav-container">
      <button class="bottom-nav-item active" data-tab="logistica">
        <div class="nav-icon">
          🚗
          <span class="nav-badge-pill" id="badge-bottom-trips" style="display:none;">0</span>
        </div>
        <span class="nav-text">Viagens</span>
      </button>

      <button class="bottom-nav-item" data-tab="dashboard">
        <div class="nav-icon">📋</div>
        <span class="nav-text">Painel</span>
      </button>

      <button class="bottom-nav-item" data-tab="consultas">
        <div class="nav-icon">
          🩺
          <span class="nav-badge-pill" id="badge-bottom-consultas" style="display:none;">0</span>
        </div>
        <span class="nav-text">Consultas</span>
      </button>

      <button class="bottom-nav-item" data-tab="exames">
        <div class="nav-icon">
          🔬
          <span class="nav-badge-pill" id="badge-bottom-exames" style="display:none;">0</span>
        </div>
        <span class="nav-text">Exames</span>
      </button>

      <button class="bottom-nav-item" data-tab="remedios">
        <div class="nav-icon">
          💊
          <span class="nav-badge-pill" id="badge-bottom-remedios" style="display:none;">0</span>
        </div>
        <span class="nav-text">Remédios</span>
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
