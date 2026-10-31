# 🌊 Família em Dia

> **Aplicativo móvel e PWA de gestão de cuidados familiares, logística regional de saídas e controle de medicação.**  
> Projetado especialmente para a cuidadora Ednéia gerenciar a saúde e os compromissos de entes queridos em múltiplas cidades da região.

---

## 📱 Visão Geral e Design Ocean Teal

O sistema adota uma interface moderna baseada no **UI Kit Ocean Teal (8 telas)**, com foco em ergonomia no celular:

* **Header Curvo Ocean Teal (`#008b9e`)**: Topo curvo com saudação personalizada (*Ednéia • Família em Dia*), avatar e atalho de perfil.
* **Barra de Pesquisa e Filtros**: Campo de busca rápida com botão teal para novos agendamentos e filtros horizontais em pílula (*Todos, 🩺 Saúde, 🏛️ INSS, 🏦 Banco, 📋 Outro*).
* **Card de Estatísticas com Donut Chart**: Gráfico circular SVG interativo demonstrando consultas agendadas (verde), laudos/exames prontos para retorno (ciano) e remédios a comprar (laranja).
* **Otimizador Regional de Caronas e Saídas**: Agrupamento inteligente de consultas e exames na mesma data e cidade para economizar deslocamentos e combustível.
* **Inventário de Farmácia**: Controle visual dos medicamentos de uso contínuo com alerta de compra e indicação da cidade preferencial.
* **Menu Inferior Flutuante (Bottom Navigation)**: 4 guias com botão central circular destacado (**FAB +**) para agendamento instantâneo.

---

## 👥 Família Atendida (6 Pessoas)

O aplicativo foi calibrado para o cuidado dedicado de 6 membros da família, cada um com sua cor de identificação:

1. 💜 **Ednéia** (Cuidadora)
2. 💖 **Mãe**
3. 💚 **Carlos Romeu**
4. 💙 **Edyr**
5. 🧡 **Rogério**
6. 🩵 **Tia Mariazinha**

---

## 📍 Cidades e Rotas Regionais Atendidas

* Resende (RJ)
* São José do Barreiro (SP)
* Formoso (SP)
* Cruzeiro (SP)
* Arapeí (SP)
* Bananal (SP)
* Taubaté (SP)
* São José dos Campos (SP)

---

## 🛠️ Tecnologias Utilizadas

* **Front-end**: HTML5 semântico, CSS3 moderno (Variáveis CSS, Flexbox, CSS Grid, SVG responsivo) e JavaScript Vanilla puro.
* **Back-end e Persistência**: 
  - Suporte a PHP + SQLite para execução local (XAMPP).
  - Suporte a Cloudflare Workers / D1 para deploy em nuvem.
  - Modo Local Storage com sincronização automática e suporte total a PWA Offline.
* **PWA**: Service Worker com cache-first (`sw.js`), `manifest.json` instalável na tela inicial do Android e iOS.

---

## 🚀 Como Executar

### Localmente com XAMPP
1. Clone ou mantenha a pasta no diretório `c:\xampp\htdocs\sem-perder-a-data`.
2. Inicie o Apache no painel do XAMPP.
3. Acesse `http://localhost/sem-perder-a-data` no navegador.

### No Celular (PWA)
1. Abra o endereço no navegador do celular (Chrome ou Safari).
2. Toque em **"Instalar aplicativo"** ou **"Adicionar à Tela de Início"**.
