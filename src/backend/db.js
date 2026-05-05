// src/backend/db.js
// Camada de persistencia do backend - Etapa 3 (Postgres).
//
// =====================================================================
// Substitui o stub em memoria das versoes anteriores. Mantem a mesma
// interface publica do stub, mas TODAS as funcoes agora sao async.
// Schema definido em configs/schema.sql.
// =====================================================================

const config = require('../config');
const { pool } = require('./pool');

// =====================================================================
// INGESTAO
// =====================================================================

/**
 * Insere o evento no historico. Idempotente por eventId via PRIMARY KEY +
 * ON CONFLICT DO NOTHING — retorna true so quando a linha foi de fato inserida.
 *
 * @param {object} evt
 * @returns {Promise<boolean>} true = nova insercao; false = duplicado
 */
async function saveEvent(evt) {
  const r = await pool.query(
    `INSERT INTO spot_events
       (event_id, ts, sector_id, spot_id, state, source, raw_payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (event_id) DO NOTHING
     RETURNING event_id`,
    [
      evt.eventId,
      evt.ts,
      evt.sectorId,
      evt.spotId,
      evt.state,
      evt.source || null,
      evt,
    ]
  );
  return r.rowCount > 0;
}

/**
 * Upsert do estado atual da vaga. Protegido contra eventos fora de ordem
 * pelo `WHERE last_ts IS NULL OR EXCLUDED.last_ts >= last_ts`.
 */
async function updateSpotState(evt) {
  await pool.query(
    `INSERT INTO spots
       (spot_id, sector_id, state, last_event_id, last_ts, last_source, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (spot_id) DO UPDATE
       SET state         = EXCLUDED.state,
           sector_id     = EXCLUDED.sector_id,
           last_event_id = EXCLUDED.last_event_id,
           last_ts       = EXCLUDED.last_ts,
           last_source   = EXCLUDED.last_source,
           updated_at    = NOW()
       WHERE spots.last_ts IS NULL OR EXCLUDED.last_ts >= spots.last_ts`,
    [
      evt.spotId,
      evt.sectorId,
      evt.state,
      evt.eventId,
      evt.ts,
      evt.source || null,
    ]
  );
}

async function saveGatewayStatus(payload) {
  if (!payload || !payload.sectorId) return false;
  await pool.query(
    `INSERT INTO gateway_status (sector_id, status, payload, received_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (sector_id) DO UPDATE
       SET status      = EXCLUDED.status,
           payload     = EXCLUDED.payload,
           received_at = NOW()`,
    [payload.sectorId, payload.status || null, payload]
  );
  return true;
}

async function getGatewayStatuses() {
  const r = await pool.query(
    `SELECT sector_id, status, payload, received_at
     FROM gateway_status
     ORDER BY sector_id`
  );
  return r.rows.map((row) => ({
    sectorId: row.sector_id,
    status: row.status,
    payload: row.payload,
    receivedAt: row.received_at ? row.received_at.toISOString() : null,
  }));
}

// =====================================================================
// LEITURA — mapa, setores, vagas (Etapa 4)
// =====================================================================

async function getMap() {
  const sectors = [];
  for (const sectorId of config.sectors) {
    sectors.push({ sectorId, spots: await getSectorSpots(sectorId) });
  }
  return { ts: new Date().toISOString(), sectors };
}

async function getSectorsSummary() {
  const out = [];
  for (const sectorId of config.sectors) {
    out.push({ sectorId, ...(await getSectorOccupancy(sectorId)) });
  }
  return out;
}

async function getSectorOccupancy(sectorId) {
  const r = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE state = 'OCCUPIED')::int AS occupied_count,
       COUNT(*)::int                                    AS known_count,
       MAX(last_ts)                                     AS last_update_ts
     FROM spots
     WHERE sector_id = $1`,
    [sectorId]
  );
  const row = r.rows[0];
  const total = config.spotsPerSector;
  const occupiedCount = row.occupied_count || 0;
  const knownCount = row.known_count || 0;
  // Vagas ainda sem evento contam como FREE pra nao distorcer pra cima
  const freeCount = total - occupiedCount;
  const occupancyRate = total > 0 ? occupiedCount / total : 0;
  return {
    occupiedCount,
    freeCount,
    occupancyRate: parseFloat(occupancyRate.toFixed(3)),
    knownCount,
    total,
    lastUpdateTs: row.last_update_ts ? row.last_update_ts.toISOString() : null,
  };
}

async function getSectorSpots(sectorId) {
  const r = await pool.query(
    `SELECT spot_id, sector_id, state, last_event_id, last_ts, last_source
     FROM spots WHERE sector_id = $1`,
    [sectorId]
  );
  const known = new Map(r.rows.map((row) => [row.spot_id, row]));
  const lista = [];
  for (let i = 1; i <= config.spotsPerSector; i++) {
    const numero = String(i).padStart(2, '0');
    const spotId = `${sectorId}-${numero}`;
    const row = known.get(spotId);
    if (row) {
      lista.push({
        spotId: row.spot_id,
        sectorId: row.sector_id,
        state: row.state,
        lastEventId: row.last_event_id,
        lastTs: row.last_ts ? row.last_ts.toISOString() : null,
        lastSource: row.last_source,
      });
    } else {
      lista.push({
        spotId,
        sectorId,
        state: 'UNKNOWN',
        lastEventId: null,
        lastTs: null,
        lastSource: null,
      });
    }
  }
  return lista;
}

async function getFreeSpots(sectorId, limit) {
  const todas = await getSectorSpots(sectorId);
  const livres = todas.filter((s) => s.state === 'FREE');
  if (limit && Number.isFinite(limit) && limit > 0) return livres.slice(0, limit);
  return livres;
}

// =====================================================================
// RELATORIOS — turnover (Etapa 4)
// =====================================================================

/**
 * Conta transicoes FREE -> OCCUPIED no intervalo [from, to].
 * A transicao usa LAG sobre spot_events ordenado por ts dentro de cada vaga.
 * Se sectorId for omitido, retorna agregado por setor.
 */
async function getTurnoverCount({ sectorId, from, to } = {}) {
  const r = await pool.query(
    `WITH transitions AS (
       SELECT sector_id,
              state,
              ts,
              LAG(state) OVER (PARTITION BY spot_id ORDER BY ts) AS prev_state
       FROM spot_events
     )
     SELECT sector_id, COUNT(*)::int AS turnover
     FROM transitions
     WHERE prev_state = 'FREE'
       AND state      = 'OCCUPIED'
       AND ($1::text        IS NULL OR sector_id = $1)
       AND ($2::timestamptz IS NULL OR ts >= $2)
       AND ($3::timestamptz IS NULL OR ts <= $3)
     GROUP BY sector_id`,
    [sectorId || null, from || null, to || null]
  );

  if (sectorId) {
    const row = r.rows.find((x) => x.sector_id === sectorId);
    return {
      sectorId,
      from: from || null,
      to: to || null,
      turnover: row ? row.turnover : 0,
    };
  }
  const bySector = Object.fromEntries(config.sectors.map((s) => [s, 0]));
  let total = 0;
  for (const row of r.rows) {
    bySector[row.sector_id] = row.turnover;
    total += row.turnover;
  }
  return { from: from || null, to: to || null, bySector, total };
}

// =====================================================================
// RECOMENDACOES (Etapa 5)
// =====================================================================

async function logRecommendation(entry) {
  const r = await pool.query(
    `INSERT INTO recommendations_log
       (ts, from_sector, recommended_sector, reason, data_json)
     VALUES (COALESCE($1::timestamptz, NOW()), $2, $3, $4, $5)
     RETURNING ts, from_sector, recommended_sector, reason, data_json`,
    [
      entry.ts || null,
      entry.fromSector,
      entry.recommendedSector || null,
      entry.reason,
      entry.dataJson || null,
    ]
  );
  const row = r.rows[0];
  return {
    ts: row.ts.toISOString(),
    fromSector: row.from_sector,
    recommendedSector: row.recommended_sector,
    reason: row.reason,
    dataJson: row.data_json,
  };
}

async function getRecommendations({ fromSector, limit } = {}) {
  const params = [];
  let where = '';
  if (fromSector) {
    params.push(fromSector);
    where = `WHERE from_sector = $${params.length}`;
  }
  let limitClause = '';
  if (limit && Number.isFinite(limit) && limit > 0) {
    params.push(limit);
    limitClause = `LIMIT $${params.length}`;
  }
  const r = await pool.query(
    `SELECT ts, from_sector, recommended_sector, reason, data_json
     FROM recommendations_log
     ${where}
     ORDER BY ts DESC
     ${limitClause}`,
    params
  );
  return r.rows.map((row) => ({
    ts: row.ts.toISOString(),
    fromSector: row.from_sector,
    recommendedSector: row.recommended_sector,
    reason: row.reason,
    dataJson: row.data_json,
  }));
}

// =====================================================================
// SNAPSHOTS (Etapa 3 — sector_snapshots)
// =====================================================================

async function saveSectorSnapshot({ sectorId, occupiedCount, freeCount, occupancyRate }) {
  await pool.query(
    `INSERT INTO sector_snapshots (sector_id, occupied_count, free_count, occupancy_rate)
     VALUES ($1, $2, $3, $4)`,
    [sectorId, occupiedCount, freeCount, occupancyRate]
  );
}

// =====================================================================
// STATS / DEBUG
// =====================================================================

async function getStats() {
  const r = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM spot_events)::int                          AS total_eventos,
       (SELECT COUNT(*) FROM spots)::int                                AS total_spots,
       (SELECT COUNT(*) FROM spots WHERE state = 'OCCUPIED')::int       AS ocupadas,
       (SELECT COUNT(*) FROM gateway_status)::int                       AS gateways,
       (SELECT COUNT(*) FROM recommendations_log)::int                  AS recomendacoes,
       (SELECT COUNT(*) FROM sector_snapshots)::int                     AS snapshots`
  );
  const row = r.rows[0];
  return {
    totalEventos: row.total_eventos,
    totalSpotsConhecidas: row.total_spots,
    ocupadas: row.ocupadas,
    livres: row.total_spots - row.ocupadas,
    gatewaysVistos: row.gateways,
    recomendacoes: row.recomendacoes,
    snapshots: row.snapshots,
  };
}

module.exports = {
  // Ingestao
  saveEvent,
  updateSpotState,
  saveGatewayStatus,
  // Leitura — mapa/setores
  getMap,
  getSectorsSummary,
  getSectorOccupancy,
  getSectorSpots,
  getFreeSpots,
  getGatewayStatuses,
  // Relatorios
  getTurnoverCount,
  // Recomendacoes
  logRecommendation,
  getRecommendations,
  // Snapshots
  saveSectorSnapshot,
  // Stats
  getStats,
};
