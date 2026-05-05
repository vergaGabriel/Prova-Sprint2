// src/backend/incidentDb.js
// Persistencia de incidentes (Etapa 6) em Postgres.
//
// INTERFACE PUBLICA (todas async agora):
//   openIncident(data)            -> incident object (abre ou retorna o aberto)
//   closeIncident(id, tsClose)    -> boolean
//   getIncidents(filters)         -> array filtrado (mais recente primeiro)
//   getOpenIncident(spotId, type) -> incident | null
//   getIncidentById(id)           -> incident | null
//   getStats()                    -> contagens
//
// Tabela `incidents` definida em configs/schema.sql. Indice parcial UNIQUE
// (spot_id, type) WHERE status='open' garante que so existe um aberto por
// vaga+tipo ao mesmo tempo.

const { v4: uuidv4 } = require('uuid');
const { pool } = require('./pool');

// Severidade padrao por tipo (mantida do stub anterior)
const SEVERITY = {
  STUCK_OCCUPIED: 'high',
  STUCK_FREE:     'medium',
  FLAPPING:       'high',
};

// Converte uma row do Postgres (snake_case + Date objects) pro formato do app.
function rowToIncident(row) {
  if (!row) return null;
  return {
    id:           row.id,
    tsOpen:       row.ts_open ? row.ts_open.toISOString() : null,
    tsClose:      row.ts_close ? row.ts_close.toISOString() : null,
    type:         row.type,
    severity:     row.severity,
    sectorId:     row.sector_id,
    spotId:       row.spot_id,
    evidenceJson: row.evidence_json || {},
    status:       row.status,
    lastSeenAt:   row.last_seen_at ? row.last_seen_at.toISOString() : null,
  };
}

/**
 * Abre incidente novo OU retorna o ja aberto pra mesmo (spotId, type).
 * Usa transacao + SELECT FOR UPDATE pra evitar corrida quando dois eventos
 * disparam o detector ao mesmo tempo.
 */
async function openIncident({ type, sectorId, spotId, evidenceJson = {} }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Tem incidente aberto pra essa vaga+tipo? Trava ele.
    const existing = await client.query(
      `SELECT * FROM incidents
       WHERE spot_id = $1 AND type = $2 AND status = 'open'
       FOR UPDATE`,
      [spotId, type]
    );

    if (existing.rowCount > 0) {
      // Atualiza evidencia (merge JSONB) + last_seen_at e devolve.
      const r = await client.query(
        `UPDATE incidents
         SET evidence_json = evidence_json || $2::jsonb,
             last_seen_at  = NOW()
         WHERE id = $1
         RETURNING *`,
        [existing.rows[0].id, evidenceJson]
      );
      await client.query('COMMIT');
      return rowToIncident(r.rows[0]);
    }

    // 2) Nao existe -> insere novo.
    const id = uuidv4();
    const r = await client.query(
      `INSERT INTO incidents
         (id, type, severity, sector_id, spot_id, evidence_json, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'open')
       RETURNING *`,
      [id, type, SEVERITY[type] || 'medium', sectorId, spotId, evidenceJson]
    );
    await client.query('COMMIT');

    console.log(`[incidents] ABERTO ${type} em ${spotId} (id=${id.slice(0, 8)})`);
    return rowToIncident(r.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Fecha incidente pelo id. Idempotente: se ja estava fechado, retorna false.
 */
async function closeIncident(id, tsClose) {
  const r = await pool.query(
    `UPDATE incidents
     SET status   = 'closed',
         ts_close = COALESCE($2::timestamptz, NOW())
     WHERE id = $1 AND status = 'open'
     RETURNING id, type, spot_id`,
    [id, tsClose || null]
  );
  if (r.rowCount > 0) {
    const row = r.rows[0];
    console.log(`[incidents] FECHADO ${row.type} em ${row.spot_id} (id=${id.slice(0, 8)})`);
    return true;
  }
  return false;
}

async function getOpenIncident(spotId, type) {
  const r = await pool.query(
    `SELECT * FROM incidents
     WHERE spot_id = $1 AND type = $2 AND status = 'open'
     LIMIT 1`,
    [spotId, type]
  );
  return rowToIncident(r.rows[0]);
}

async function getIncidentById(id) {
  const r = await pool.query(`SELECT * FROM incidents WHERE id = $1`, [id]);
  return rowToIncident(r.rows[0]);
}

async function getIncidents(filters = {}) {
  const params = [];
  const where = [];
  if (filters.status) {
    params.push(filters.status);
    where.push(`status = $${params.length}`);
  }
  if (filters.type) {
    params.push(filters.type);
    where.push(`type = $${params.length}`);
  }
  if (filters.sectorId) {
    params.push(filters.sectorId);
    where.push(`sector_id = $${params.length}`);
  }
  if (filters.spotId) {
    params.push(filters.spotId);
    where.push(`spot_id = $${params.length}`);
  }
  const sql = `
    SELECT * FROM incidents
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY ts_open DESC
  `;
  const r = await pool.query(sql, params);
  return r.rows.map(rowToIncident);
}

async function getStats() {
  const r = await pool.query(
    `SELECT
       COUNT(*)::int                                                        AS total,
       COUNT(*) FILTER (WHERE status = 'open')::int                         AS open,
       COUNT(*) FILTER (WHERE status = 'closed')::int                       AS closed,
       COUNT(*) FILTER (WHERE status = 'open' AND type = 'STUCK_OCCUPIED')::int AS stuck_occupied,
       COUNT(*) FILTER (WHERE status = 'open' AND type = 'STUCK_FREE')::int     AS stuck_free,
       COUNT(*) FILTER (WHERE status = 'open' AND type = 'FLAPPING')::int       AS flapping
     FROM incidents`
  );
  const row = r.rows[0];
  return {
    total:  row.total,
    open:   row.open,
    closed: row.closed,
    byType: {
      STUCK_OCCUPIED: row.stuck_occupied,
      STUCK_FREE:     row.stuck_free,
      FLAPPING:       row.flapping,
    },
  };
}

module.exports = {
  openIncident,
  closeIncident,
  getOpenIncident,
  getIncidentById,
  getIncidents,
  getStats,
};
