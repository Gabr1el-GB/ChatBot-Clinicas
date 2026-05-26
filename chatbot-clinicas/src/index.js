require('dotenv').config();

const express = require('express');
const path    = require('path');
const db      = require('./database');
const { processarMensagem }               = require('./claude');
const { enviarMensagem, notificarClinica, extrairMensagem } = require('./whatsapp');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ── Webhook: verificação (GET) ─────────────────────────────────────────────
app.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ Webhook verificado pelo Meta');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// ── Webhook: mensagens recebidas (POST) ────────────────────────────────────
app.post('/webhook', async (req, res) => {
  // Responde imediatamente ao Meta (exigido — timeout de 15s)
  res.sendStatus(200);

  const msg = extrairMensagem(req.body);
  if (!msg) return;

  const { telefone, texto } = msg;
  console.log(`📩 [${telefone}] ${texto}`);

  try {
    const resultado = await processarMensagem(telefone, texto);

    // Envia resposta ao cliente
    await enviarMensagem(telefone, resultado.texto);
    console.log(`📤 [${telefone}] resposta enviada`);

    // Agendamento detectado → notifica clínica
    if (resultado.agendamento) {
      console.log(`✅ Agendamento #${resultado.agendamento.id} salvo`);
      await notificarClinica({ telefone, ...resultado.agendamento });
    }

    // Transferência para humano
    if (resultado.transferir) {
      const aviso = process.env.CLINICA_WHATSAPP;
      if (aviso) {
        await enviarMensagem(
          aviso,
          `⚠️ Cliente ${telefone} solicitou atendimento humano. Por favor entre em contato.`
        );
      }
    }
  } catch (err) {
    console.error('❌ Erro ao processar mensagem:', err.message);
    await enviarMensagem(
      telefone,
      'Desculpe, tivemos uma instabilidade. Por favor, tente novamente em instantes.'
    ).catch(() => {});
  }
});

// ── API Admin ──────────────────────────────────────────────────────────────

/** Lista agendamentos (com filtro opcional: ?status=pendente) */
app.get('/api/agendamentos', (req, res) => {
  const { status } = req.query;
  res.json(db.listarAgendamentos(status || null));
});

/** Atualiza status de um agendamento */
app.patch('/api/agendamentos/:id', (req, res) => {
  const { id }     = req.params;
  const { status } = req.body;
  const permitidos = ['pendente', 'confirmado', 'cancelado'];
  if (!permitidos.includes(status)) {
    return res.status(400).json({ erro: 'Status inválido' });
  }
  db.atualizarStatus(Number(id), status);
  res.json({ ok: true });
});

/** Resumo para o dashboard */
app.get('/api/dashboard', (req, res) => {
  const contagem = db.contarPorStatus();
  const map      = { pendente: 0, confirmado: 0, cancelado: 0 };
  contagem.forEach(r => (map[r.status] = r.total));
  const recentes = db.listarAgendamentos().slice(0, 5);
  res.json({ contagem: map, recentes });
});

// ── Inicia servidor ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📋 Painel admin: http://localhost:${PORT}`);
  console.log(`🔗 Webhook URL:  http://localhost:${PORT}/webhook\n`);
});
