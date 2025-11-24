# SIAS - Sistema Integrado de Atendimento Social


> Um sistema moderno, eficiente e intuitivo para gestão de filas e atendimento ao cidadão, desenvolvido para modernizar Secretarias de Assistência Social.

## 📋 Sobre o Projeto

O **SIAS** foi desenvolvido para resolver o caos no atendimento presencial de órgãos públicos. Ele substitui as antigas senhas de papel e gritos por um sistema digital integrado que organiza o fluxo desde a chegada do cidadão até a conclusão do atendimento, gerando dados valiosos para a gestão.

O sistema foi projetado com foco na **Experiência do Usuário (UX)**, garantindo que servidores com qualquer nível de conhecimento técnico possam utilizá-lo sem dificuldades.

## ✨ Funcionalidades Principais

### 🖥️ Recepção Inteligente
- **Emissão Rápida:** Geração de senhas com 2 cliques.
- **Triagem:** Classificação por prioridade (Normal, Idoso, Gestante, PCD) e tipo de serviço.
- **Impressão:** Integração com impressoras térmicas.
- **Busca:** Localização rápida de cidadãos na fila.

![Recepção](assets/reception.png)

### 📺 Painel de Chamada (TV)
- **Mídia Digital:** Exibição de vídeos institucionais ou notícias enquanto aguarda.
- **Chamada Vocal:** Anúncio sonoro da senha e guichê ("Senha A-012, Guichê 3").
- **Alertas Visuais:** Destaque piscante para chamar atenção.

![Painel TV](assets/tv_panel.png)

### 👩‍💼 Módulo do Atendente
- **Fila Individual:** Visualização clara de quem está aguardando.
- **Controle Total:** Chamar, Iniciar, Finalizar, Marcar Ausente ou Transferir.
- **Takeover:** Capacidade de assumir senhas de outros guichês em caso de gargalos.

### 📊 Relatórios e BI
- **Métricas em Tempo Real:** Tempo médio de espera e atendimento.
- **Gráficos:** Horários de pico e desempenho por atendente.
- **Exportação:** Dados completos em CSV para auditoria.

### 🛡️ Admin & Segurança
- **Gestão de Serviços:** Criação dinâmica de novos tipos de atendimento.
- **Perfis de Acesso:** Recepção, Atendente e Gerente.
- **Segurança:** Autenticação robusta e proteção de dados (RLS).

## 🛠️ Tecnologias Utilizadas

O projeto utiliza uma stack moderna e escalável:

- **Frontend:** [React](https://reactjs.org/) + [Vite](https://vitejs.dev/) (Performance extrema)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/) (Segurança e manutenibilidade)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/) (Design system consistente)
- **Backend (BaaS):** [Supabase](https://supabase.com/) (PostgreSQL, Auth, Realtime, Storage)
- **Ícones:** Google Material Symbols
- **Gráficos:** Recharts

## 🚀 Como Rodar Localmente

1. **Clone o repositório**
   ```bash
   git clone https://github.com/seu-usuario/sias-sistema.git
   cd sias-sistema
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as Variáveis de Ambiente**
   Crie um arquivo `.env` na raiz e adicione suas chaves do Supabase:
   ```env
   VITE_SUPABASE_URL=sua_url_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima
   VITE_GOOGLE_API_KEY=sua_chave_gemini_(opcional)
   ```

4. **Execute o projeto**
   ```bash
   npm run dev
   ```

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---
Desenvolvido por **João Luis** 🚀
