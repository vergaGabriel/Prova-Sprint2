-- configs/schema.sql
-- Esquema do banco do Estacionamento Inteligente (Etapa 3 da prova).
-- Executado AUTOMATICAMENTE pelo Postgres na primeira subida do container,
-- via bind em /docker-entrypoint-initdb.d/. Em subidas seguintes (mesmo
-- volume pgdata), este arquivo e ignorado.
--
-- Tabelas exigidas pelo spec:
--   spots, spot_events, sector_snapshots, incidents, recommendations_log
-- Tabela auxiliar (saude do sistema, fora do spec):
--   gateway_status

-- =====================================================================
-- 1) spots — estado atual de cada vaga (upsert por spot_id)
-- =====================================================================
CREATE TABLE IF NOT EXISTS spots (
  spot_id        TEXT PRIMARY KEY,
  sector_id      TEXT NOT NULL,
  state          TEXT NOT NULL CHECK (state IN ('FREE', 'OCCUPIED')),
  last_event_id  UUID,
  last_ts        TIMESTAMPTZ,
  last_source    TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS spots_sector_idx ON spots (sector_id);

-- =====================================================================
-- 2) spot_events — historico bruto, idempotente por event_id
-- =====================================================================
CREATE TABLE IF NOT EXISTS spot_events (
  event_id     UUID PRIMARY KEY,
  ts           TIMESTAMPTZ NOT NULL,
  sector_id    TEXT NOT NULL,
  spot_id      TEXT NOT NULL,
  state        TEXT NOT NULL CHECK (state IN ('FREE', 'OCCUPIED')),
  source       TEXT,
  raw_payload  JSONB NOT NULL,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices pra consulta de turnover (FREE->OCCUPIED por janela de tempo)
CREATE INDEX IF NOT EXISTS spot_events_sector_ts_idx
  ON spot_events (sector_id, ts);
CREATE INDEX IF NOT EXISTS spot_events_spot_ts_idx
  ON spot_events (spot_id, ts);

-- =====================================================================
-- 3) sector_snapshots — snapshot por minuto (alimentado por job)
-- =====================================================================
CREATE TABLE IF NOT EXISTS sector_snapshots (
  id              BIGSERIAL PRIMARY KEY,
  ts              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sector_id       TEXT NOT NULL,
  occupied_count  INTEGER NOT NULL,
  free_count      INTEGER NOT NULL,
  occupancy_rate  NUMERIC(4,3) NOT NULL
);

CREATE INDEX IF NOT EXISTS sector_snapshots_sector_ts_idx
  ON sector_snapshots (sector_id, ts DESC);

-- =====================================================================
-- 4) incidents — anomalias detectadas (Etapa 6)
-- =====================================================================
CREATE TABLE IF NOT EXISTS incidents (
  id            UUID PRIMARY KEY,
  ts_open       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ts_close      TIMESTAMPTZ,
  type          TEXT NOT NULL CHECK (type IN ('STUCK_OCCUPIED', 'STUCK_FREE', 'FLAPPING')),
  severity      TEXT NOT NULL,
  sector_id     TEXT NOT NULL,
  spot_id       TEXT,
  evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garante que so existe UM incidente aberto por (spot_id, type) ao mesmo tempo.
-- Indice parcial: vale apenas para linhas com status='open'. Quando o incidente
-- e fechado, ele sai do indice e um novo pode ser aberto pra mesma vaga+tipo.
CREATE UNIQUE INDEX IF NOT EXISTS incidents_open_unique
  ON incidents (spot_id, type)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS incidents_status_idx ON incidents (status);
CREATE INDEX IF NOT EXISTS incidents_sector_idx ON incidents (sector_id);

-- =====================================================================
-- 5) recommendations_log — log da regra R-OP1 (Etapa 5)
-- =====================================================================
CREATE TABLE IF NOT EXISTS recommendations_log (
  id                  BIGSERIAL PRIMARY KEY,
  ts                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  from_sector         TEXT NOT NULL,
  recommended_sector  TEXT,
  reason              TEXT NOT NULL,
  data_json           JSONB
);

CREATE INDEX IF NOT EXISTS recommendations_from_sector_ts_idx
  ON recommendations_log (from_sector, ts DESC);

-- =====================================================================
-- AUXILIAR) gateway_status — ultimo status conhecido de cada gateway
-- =====================================================================
CREATE TABLE IF NOT EXISTS gateway_status (
  sector_id    TEXT PRIMARY KEY,
  status       TEXT,
  payload      JSONB,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
