const axios = require('axios');

const BASE_URL = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}`;
const HEADERS  = {
  Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
  'Content-Type': 'application/json',
};

/** Envia mensagem de texto simples para um número */
async function enviarMensagem(para, texto) {
  await axios.post(
    `${BASE_URL}/messages`,
    {
      messaging_product: 'whatsapp',
      to: para,
      type: 'text',
      text: { body: texto },
    },
    { headers: HEADERS }
  );
}

/**
 * Notifica a clínica sobre um novo agendamento.
 * Envia mensagem estruturada para o número da clínica.
 */
async function notificarClinica(agendamento) {
  const numeroClinica = process.env.CLINICA_WHATSAPP;
  if (!numeroClinica) return;

  const msg =
    `🗓️ *Novo agendamento confirmado!*\n\n` +
    `*ID:* #${agendamento.id}\n` +
    `*Paciente:* ${agendamento.nome}\n` +
    `*Procedimento:* ${agendamento.procedimento}\n` +
    `*Data/Hora:* ${agendamento.dataHora}\n` +
    `*Telefone:* ${agendamento.telefone}\n\n` +
    `Acesse o painel para confirmar ou reagendar.`;

  await enviarMensagem(numeroClinica, msg);
}

/**
 * Extrai o número de telefone e o texto de um payload de webhook do WhatsApp.
 * Retorna null se a mensagem não for de texto.
 */
function extrairMensagem(body) {
  try {
    const entry   = body.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    const msg     = changes?.messages?.[0];

    if (!msg || msg.type !== 'text') return null;

    return {
      telefone: msg.from,
      texto: msg.text.body,
    };
  } catch {
    return null;
  }
}

module.exports = { enviarMensagem, notificarClinica, extrairMensagem };
