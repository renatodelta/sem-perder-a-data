<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Sem Perder a Data - Gestão de Saúde & Logística</title>
  <meta name="description" content="Aplicativo da Ednéia para organização de consultas, exames vinculados a retornos, remédios e logística de caronas compartilhadas.">
  
  <!-- Configurações para Instalação como Aplicativo no Celular (PWA) -->
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#0d9488">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="Sem Perder a Data">
  <link rel="apple-touch-icon" href="assets/icons/icon-192.png">
  <link rel="icon" type="image/png" sizes="192x192" href="assets/icons/icon-192.png">
  
  <!-- Tipografia Moderna Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  
  <!-- Folha de Estilos -->
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

  <!-- CABEÇALHO PRINCIPAL -->
  <header class="header-app">
    <div class="header-container">
      <div class="logo-area">
        <div class="logo-icon">🩺</div>
        <div class="logo-text">
          <h1>Sem Perder a Data</h1>
          <p>Painel de Saúde e Logística • Ednéia</p>
        </div>
      </div>
      
      <div class="header-actions">
        <!-- Botão especial para Ednéia instalar no celular com 1 toque -->
        <button class="btn btn-sm btn-install-pwa" onclick="App.promptInstall()" style="display:none; background:#f59e0b; color:#ffffff; font-weight:800; border:none; box-shadow:0 2px 6px rgba(0,0,0,0.15);">
          <span>📲 Instalar no Celular</span>
        </button>

        <button class="btn btn-sm btn-secondary" onclick="App.openModal('modal-appointment')" style="background: rgba(255,255,255,0.95);">
          <span>+ Nova Consulta</span>
        </button>
        <button class="btn btn-sm btn-secondary" onclick="App.openModal('modal-exam')" style="background: rgba(255,255,255,0.95);">
          <span>+ Novo Exame</span>
        </button>
      </div>
    </div>
  </header>

  <!-- BARRA DE NAVEGAÇÃO POR ABAS -->
  <nav class="tabs-nav-bar">
    <div class="tabs-container">
      <button class="nav-tab-btn active" data-tab="logistica" id="tab-nav-logistica">
        <span>🚗 Viagens & Carona</span>
        <span class="nav-tab-badge" id="badge-trips">0</span>
      </button>

      <button class="nav-tab-btn" data-tab="dashboard" id="tab-nav-dashboard">
        <span>📋 Painel Geral</span>
      </button>

      <button class="nav-tab-btn" data-tab="consultas" id="tab-nav-consultas">
        <span>🩺 Consultas</span>
        <span class="nav-tab-badge" id="badge-appointments">0</span>
      </button>

      <button class="nav-tab-btn" data-tab="exames" id="tab-nav-exames">
        <span>🔬 Exames & Retornos</span>
        <span class="nav-tab-badge" id="badge-exams">0</span>
      </button>

      <button class="nav-tab-btn" data-tab="remedios" id="tab-nav-remedios">
        <span>💊 Remédios</span>
        <span class="nav-tab-badge" id="badge-meds">0</span>
      </button>

      <button class="nav-tab-btn" data-tab="familiares" id="tab-nav-familiares">
        <span>👥 Pessoas</span>
      </button>
    </div>
  </nav>

  <!-- ÁREA DE CONTEÚDO PRINCIPAL -->
  <main class="main-wrapper">
    <div id="tab-content-area">
      <!-- O conteúdo será injetado dinamicamente pelo app.js -->
    </div>
  </main>

  <!-- =========================================================================
       MODAL 1: NOVA / EDITAR CONSULTA
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
              <input type="text" id="app-specialty" class="form-control" placeholder="Ex: Cardiologia, Oftalmologia, Geriatria" required>
            </div>
            <div class="form-group">
              <label class="form-label">Nome do Médico (Opcional)</label>
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
              <input type="text" id="app-location" class="form-control" placeholder="Ex: Hospital Vera Cruz">
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
            <textarea id="app-notes" class="form-control" placeholder="Ex: Levar exames anteriores, chegar com antecedência..."></textarea>
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
       MODAL 2: NOVO / EDITAR EXAME
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
            <input type="text" id="exam-name" class="form-control" placeholder="Ex: Hemograma Completo, Ecocardiograma" required>
          </div>

          <div class="form-group" style="background:#eff6ff; padding:0.85rem; border-radius:var(--radius-md); border:1px solid #bfdbfe;">
            <label class="form-label" style="color:#1e3a8a;">🎯 Em qual Consulta de Retorno levar o resultado?</label>
            <select id="exam-target-appointment-id" class="form-control"></select>
            <small style="color:#3b82f6; display:block; margin-top:4px;">
              Assim que o laudo estiver pronto, ele aparecerá na data desta consulta para Ednéia não esquecer de levar!
            </small>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Status Atual</label>
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
            <label class="form-label">Preparo / Observações</label>
            <textarea id="exam-notes" class="form-control" placeholder="Ex: Jejum de 12 horas, suspender remédio..."></textarea>
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
       MODAL 3: NOVO / EDITAR REMÉDIO
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
              <input type="text" id="med-dosage" class="form-control" placeholder="Ex: 50mg, 1 comprimido">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Como tomar (Instruções)</label>
            <input type="text" id="med-instructions" class="form-control" placeholder="Ex: 1x pela manhã em jejum, de 8 em 8 horas">
          </div>

          <div class="form-group">
            <label class="form-label">Cidade onde costuma comprar (Opcional)</label>
            <input type="text" id="med-city" class="form-control" placeholder="Ex: Campinas (Farmácia Popular)">
          </div>

          <div class="form-group" style="background:#fef3c7; padding:0.85rem; border-radius:var(--radius-md); border:1px solid #fde68a;">
            <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-weight:700; color:#92400e;">
              <input type="checkbox" id="med-needs-purchase" style="width:18px; height:18px;">
              <span>🛒 Precisa comprar na próxima saída!</span>
            </label>
          </div>

          <div class="form-group">
            <label class="form-label">Observações adicionais</label>
            <textarea id="med-notes" class="form-control" placeholder="Ex: Pegar receita médica nova..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-cancel-modal">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar Remédio</button>
        </div>
      </form>
    </div>
  </div>

  <!-- =========================================================================
       MODAL 4: NOVO / EDITAR PESSOA (SEM CAMPOS REDUNDANTES)
       ========================================================================= -->
  <div class="modal-overlay" id="modal-person">
    <div class="modal-dialog">
      <div class="modal-header">
        <h3 id="modal-person-title">Cadastrar Pessoa</h3>
        <button class="modal-close-btn">&times;</button>
      </div>
      <form id="form-person" onsubmit="App.savePersonForm(event)">
        <input type="hidden" id="person-id">
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group" style="flex:2;">
              <label class="form-label">Nome <span class="req">*</span></label>
              <input type="text" id="person-name" class="form-control" placeholder="Ex: Ednéia, Mãe, Edyr..." required>
            </div>
            <div class="form-group" style="flex:1;">
              <label class="form-label">Cor do Crachá</label>
              <input type="color" id="person-color" class="form-control" value="#2563eb" style="height:44px; padding:4px;">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Observações / Cuidados Especiais (Opcional)</label>
            <textarea id="person-notes" class="form-control" placeholder="Ex: Alergias, cuidados específicos..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-cancel-modal">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar Pessoa</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Scripts -->
  <script src="assets/js/app.js"></script>
</body>
</html>
