const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../db/clinica.db'));

// Habilita WAL para melhor performance
db.pragma('journal_mode = WAL');

// ── Criação das tabelas ────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS conversas (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    telefone    TEXT NOT NULL,
    role        TEXT NOT NULL CHECK(role IN ('user','assistant')),
    conteudo    TEXT NOT NULL,
    criado_em   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS agendamentos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    telefone       TEXT NOT NULL,
    nome           TEXT NOT NULL,
    procedimento   TEXT NOT NULL,
    data_hora      TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'pendente'
                   CHECK(status IN ('pendente','confirmado','cancelado')),
    criado_em      TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE INDEX IF NOT EXISTS idx_conversas_tel ON conversas(telefone);
  CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);
`);

// ── Histórico de conversa ─────────────────────────────────────────────────

/** Busca as últimas N mensagens de um telefone (para contexto do Claude) */
function getHistorico(telefone, limite = 20) {
  return db
    .prepare(`SELECT role, conteudo AS content
              FROM conversas
              WHERE telefone = ?
              ORDER BY id DESC
              LIMIT ?`)
    .all(telefone, limite)
    .reverse()
    .map(r => ({ role: r.role, content: r.content }));
}

/** Salva uma mensagem no histórico */
function salvarMensagem(telefone, role, conteudo) {
  db.prepare(
    `INSERT INTO conversas (telefone, role, conteudo) VALUES (?, ?, ?)`
  ).run(telefone, role, conteudo);
}

// ── Agendamentos ──────────────────────────────────────────────────────────

/** Cria um novo agendamento */
function criarAgendamento({ telefone, nome, procedimento, dataHora }) {
  const info = db
    .prepare(
      `INSERT INTO agendamentos (telefone, nome, procedimento, data_hora)
       VALUES (?, ?, ?, ?)`
    )
    .run(telefone, nome, procedimento, dataHora);
  return info.lastInsertRowid;
}

/** Lista todos os agendamentos (com filtro opcional de status) */
function listarAgendamentos(status = null) {
  if (status) {
    return db
      .prepare(`SELECT * FROM agendamentos WHERE status = ? ORDER BY criado_em DESC`)
      .all(status);
  }
  return db
    .prepare(`SELECT * FROM agendamentos ORDER BY criado_em DESC`)
    .all();
}

/** Atualiza o status de um agendamento */
function atualizarStatus(id, status) {
  db.prepare(`UPDATE agendamentos SET status = ? WHERE id = ?`).run(status, id);
}

/** Conta agendamentos por status (para o dashboard) */
function contarPorStatus() {
  return db
    .prepare(
      `SELECT status, COUNT(*) as total
       FROM agendamentos
       GROUP BY status`
    )
    .all();
}

module.exports = {
  getHistorico,
  salvarMensagem,
  criarAgendamento,
  listarAgendamentos,
  atualizarStatus,
  contarPorStatus,
};
