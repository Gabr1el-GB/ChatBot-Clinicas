const Anthropic = require('@anthropic-ai/sdk');
const db = require('./database');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── System prompt da Sofia ────────────────────────────────────────────────
const SYSTEM_PROMPT = `Você é Sofia, recepcionista virtual da Clínica Bella Pele, especializada em estética e dermatologia. Seu único objetivo é agendar consultas de forma simpática, profissional e eficiente.

PROCEDIMENTOS E PREÇOS:
- Consulta dermatológica: R$ 250
- Limpeza de pele profunda: R$ 180
- Peeling químico: R$ 220
- Toxina botulínica (Botox): a partir de R$ 800
- Preenchimento facial: a partir de R$ 1.200
- Laser para manchas: R$ 350/sessão
- Microagulhamento: R$ 300/sessão
- Fotorejuvenescimento: R$ 400/sessão

HORÁRIOS: Segunda a sexta das 8h às 18h. Sábados das 8h às 13h.
ENDEREÇO: Rua das Flores, 123 – Centro

FLUXO DE AGENDAMENTO:
1. Cumprimentar e perguntar o que a pessoa deseja
2. Apresentar o procedimento/preço se perguntado
3. Coletar: nome completo, procedimento desejado, data e horário preferidos
4. Confirmar todos os dados em uma mensagem de resumo
5. Ao confirmar, inclua a tag especial no final da sua mensagem:
   [AGENDAMENTO_CONFIRMADO|nome|procedimento|data e hora]
   Exemplo: [AGENDAMENTO_CONFIRMADO|Ana Lima|Botox|25/06/2025 às 14h]

REGRAS:
- Responda SEMPRE em português brasileiro
- Mensagens curtas e amigáveis (máximo 3 parágrafos)
- Nunca invente horários específicos disponíveis — diga que vai verificar
- Se a pessoa quiser falar com atendente humano, diga que vai transferir e encerre com: [TRANSFERIR_HUMANO]
- Não responda perguntas fora do escopo da clínica`;

/**
 * Extrai tag de agendamento confirmado da resposta da Sofia.
 * Retorna objeto com dados ou null.
 */
function extrairAgendamento(texto) {
  const match = texto.match(
    /\[AGENDAMENTO_CONFIRMADO\|([^|]+)\|([^|]+)\|([^\]]+)\]/
  );
  if (!match) return null;
  return {
    nome: match[1].trim(),
    procedimento: match[2].trim(),
    dataHora: match[3].trim(),
  };
}

/** Limpa as tags internas antes de enviar a mensagem ao cliente */
function limparTags(texto) {
  return texto
    .replace(/\[AGENDAMENTO_CONFIRMADO\|[^\]]+\]/g, '')
    .replace(/\[TRANSFERIR_HUMANO\]/g, '')
    .trim();
}

/**
 * Processa uma mensagem recebida e retorna a resposta da Sofia.
 * Também detecta agendamentos concluídos e os salva no banco.
 */
async function processarMensagem(telefone, mensagemUsuario) {
  // Salva mensagem do usuário
  db.salvarMensagem(telefone, 'user', mensagemUsuario);

  // Busca histórico para contexto
  const historico = db.getHistorico(telefone, 20);

  // Chama Claude
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: historico,
  });

  const respostaCompleta = response.content[0].text;

  // Salva resposta no histórico
  db.salvarMensagem(telefone, 'assistant', respostaCompleta);

  // Detecta agendamento confirmado
  const dadosAgendamento = extrairAgendamento(respostaCompleta);
  let agendamentoId = null;
  if (dadosAgendamento) {
    agendamentoId = db.criarAgendamento({
      telefone,
      nome: dadosAgendamento.nome,
      procedimento: dadosAgendamento.procedimento,
      dataHora: dadosAgendamento.dataHora,
    });
  }

  // Detecta pedido de transferência
  const transferir = respostaCompleta.includes('[TRANSFERIR_HUMANO]');

  return {
    texto: limparTags(respostaCompleta),
    agendamento: dadosAgendamento ? { id: agendamentoId, ...dadosAgendamento } : null,
    transferir,
  };
}

module.exports = { processarMensagem };
