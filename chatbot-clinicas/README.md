# Chatbot Clínica Bella Pele 🌸

Chatbot de agendamento para clínica estética integrado com **WhatsApp Business API** + **Claude AI (Anthropic)**.

---

## Funcionalidades

- Atende clientes automaticamente no WhatsApp 24/7
- Apresenta procedimentos e preços
- Coleta dados do agendamento (nome, procedimento, data/hora)
- Salva agendamentos no banco de dados (SQLite)
- **Notifica a clínica no WhatsApp** assim que um agendamento é fechado
- Permite transferência para atendente humano
- **Painel admin** web para ver e gerenciar agendamentos

---

## Estrutura do projeto

```
chatbot-clinica/
├── src/
│   ├── index.js      ← servidor Express + webhook
│   ├── claude.js     ← lógica da Sofia (Claude AI)
│   ├── whatsapp.js   ← envio de mensagens via Meta API
│   └── database.js   ← SQLite (agendamentos + histórico)
├── db/               ← banco de dados (gerado automaticamente)
├── public/
│   └── index.html    ← painel admin da clínica
├── .env.example      ← modelo de variáveis de ambiente
└── package.json
```

---

## Pré-requisitos

- Node.js 18+
- Conta no [Meta for Developers](https://developers.facebook.com/)
- Número de telefone aprovado no WhatsApp Business API
- Chave da API do Claude (Anthropic)

---

## Instalação

```bash
# 1. Clone ou copie os arquivos
cd chatbot-clinica

# 2. Instale as dependências
npm install

# 3. Crie o arquivo de configuração
cp .env.example .env
# Edite o .env com suas credenciais

# 4. Inicie o servidor
npm start
```

---

## Configuração do WhatsApp (Meta)

1. Acesse [developers.facebook.com](https://developers.facebook.com/) e crie um App do tipo **Business**
2. Adicione o produto **WhatsApp**
3. Em **Configuração** → **Webhooks**, adicione:
   - URL: `https://SEU-DOMINIO.com/webhook`
   - Token de verificação: mesmo valor de `WHATSAPP_VERIFY_TOKEN` no `.env`
   - Campos: marque `messages`
4. Copie o **Token de acesso permanente** para `WHATSAPP_TOKEN`
5. Copie o **Phone Number ID** para `WHATSAPP_PHONE_ID`

> Para testes locais, use [ngrok](https://ngrok.com/): `ngrok http 3000`  
> A URL do ngrok fica tipo: `https://abc123.ngrok.io/webhook`

---

## Variáveis de ambiente (.env)

| Variável                | Descrição                                            |
|-------------------------|------------------------------------------------------|
| `WHATSAPP_TOKEN`        | Token permanente da Meta (WhatsApp Business API)     |
| `WHATSAPP_PHONE_ID`     | ID do número de telefone no painel Meta              |
| `WHATSAPP_VERIFY_TOKEN` | String secreta para validação do webhook             |
| `ANTHROPIC_API_KEY`     | Chave da API Claude (console.anthropic.com)          |
| `CLINICA_WHATSAPP`      | Número da clínica para receber notificações          |
| `PORT`                  | Porta do servidor (padrão: 3000)                     |

---

## Painel admin

Após iniciar o servidor, acesse:

```
http://localhost:3000
```

O painel mostra:
- Cards com contagem de agendamentos por status
- Tabela com todos os agendamentos
- Filtro por status (pendente / confirmado / cancelado)
- Ação para alterar status diretamente na tabela
- Atualização automática a cada 30 segundos

---

## Deploy em produção

Recomendações para hospedar:

| Opção          | Custo       | Dificuldade |
|----------------|-------------|-------------|
| Railway        | ~$5/mês     | Baixa       |
| Render         | Grátis*     | Baixa       |
| VPS (DigitalOcean / Hostinger) | ~$6/mês | Média |

> Use **PostgreSQL** em produção em vez de SQLite.  
> Substitua `better-sqlite3` por `pg` e ajuste as queries em `database.js`.

---

## Personalização

Para adaptar a outro tipo de clínica, edite o `SYSTEM_PROMPT` em `src/claude.js`:
- Liste os procedimentos e preços da clínica
- Ajuste horários e endereço
- Modifique o nome e personalidade da assistente

---

## Licença

MIT — use livremente para projetos comerciais.
