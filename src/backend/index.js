// src/backend/index.js
// Backend: assina o broker MQTT, valida payloads, persiste de forma
// IDEMPOTENTE no Postgres (etapa 2 + etapa 3 da prova).
//
// Topicos que subscreve:
//   <NS>/campus/parking/sectors/+/spots/+/events
//   <NS>/campus/parking/sectors/+/gateway/status
//
// Para cada evento de vaga:
//   1) Valida campos obrigatorios + state
//   2) Confere se o topico bate com o payload
//   3) db.saveEvent(evt) — INSERT ON CONFLICT DO NOTHING (idempotente)
//   4) Se foi insercao nova: updateSpotState + incidentDetector + recommendationEngine
//
// Boot:
//   - Espera o Postgres responder antes de subscrever no broker (evita
//     descartar eventos por erro de DB).
//   - Inicia snapshotter de minuto.
//   - Inicia HTTP API.

const mqtt = require('mqtt');
const config = require('../config');
const db = require('./db');
const { incidentDetector } = require('./incidents');
const { recommendationEngine } = require('./recommendations');
const { startHttpApi } = require('./httpApi');
const { waitForReady, close: closePool } = require('./pool');
const { startSnapshotter, stopSnapshotter } = require('./snapshotter');

console.log('========================================');
console.log('  BACKEND - Ingestor MQTT + Postgres');
console.log('========================================');
console.log(`Broker:     ${config.mqttUrl}`);
console.log(`Namespace:  ${config.namespace || '(vazio - topicos exatos do spec)'}`);
console.log(`Postgres:   ${config.databaseUrl}`);
console.log('');

// ---------- Estatisticas (so pra log) ----------
const stats = {
  eventsReceived: 0,
  eventsInserted: 0,
  eventsDuplicates: 0,
  eventsInvalid: 0,
  statusReceived: 0,
};

// ---------- Validacao do payload de evento ----------
const VALID_STATES = new Set(['FREE', 'OCCUPIED']);
const REQUIRED_FIELDS = ['eventId', 'ts', 'sectorId', 'spotId', 'state'];

function parseSpotEvent(msgStr) {
  let evt;
  try {
    evt = JSON.parse(msgStr);
  } catch {
    return { ok: false, reason: 'json_invalido' };
  }
  for (const f of REQUIRED_FIELDS) {
    if (evt[f] === undefined || evt[f] === null || evt[f] === '') {
      return { ok: false, reason: `campo_obrigatorio_ausente:${f}` };
    }
  }
  if (!VALID_STATES.has(evt.state)) {
    return { ok: false, reason: `state_invalido:${evt.state}` };
  }
  evt.source = evt.source || 'sensor';
  return { ok: true, evt };
}

// ---------- Pipeline de evento (async) ----------
async function handleSpotEvent(topic, msg) {
  stats.eventsReceived++;

  const parsed = parseSpotEvent(msg);
  if (!parsed.ok) {
    stats.eventsInvalid++;
    console.warn(`[backend] payload invalido em ${topic}: ${parsed.reason}`);
    return;
  }
  const { evt } = parsed;

  const expected = config.topics.spotEvents(evt.sectorId, evt.spotId);
  if (topic !== expected) {
    stats.eventsInvalid++;
    console.warn(
      `[backend] topico nao bate com payload: topico=${topic} esperado=${expected}`
    );
    return;
  }

  // ===== INGESTAO IDEMPOTENTE =====
  // INSERT ON CONFLICT DO NOTHING garante idempotencia por event_id no DB.
  const inserido = await db.saveEvent(evt);
  if (inserido) {
    stats.eventsInserted++;
    await db.updateSpotState(evt);
    await incidentDetector.processar(evt);
    await recommendationEngine.processSpotChange(evt.sectorId);
  } else {
    stats.eventsDuplicates++;
  }
}

async function handleGatewayStatus(topic, msg) {
  stats.statusReceived++;
  let payload;
  try {
    payload = JSON.parse(msg);
  } catch {
    console.warn(`[backend] status invalido em ${topic}`);
    return;
  }
  await db.saveGatewayStatus(payload);
  console.log(
    `[backend] status ${payload.sectorId}=${payload.status}` +
      (payload.sensorsOccupied !== undefined
        ? ` (ocup=${payload.sensorsOccupied}/${payload.sensorsTotal})`
        : '')
  );
}

// ---------- Boot ----------
let mqttClient = null;
let healthInterval = null;

async function main() {
  // 1) Espera Postgres
  await waitForReady();
  console.log('[pg] conectado');

  // 2) Sobe HTTP API
  startHttpApi(config.apiPort);

  // 3) Inicia job de snapshots por minuto
  startSnapshotter();

  // 4) Conecta no MQTT e subscreve
  const clientId = `backend-${config.namespace || 'default'}-${Math.random()
    .toString(16)
    .slice(2, 8)}`;

  mqttClient = mqtt.connect(config.mqttUrl, {
    clientId,
    reconnectPeriod: 2000,
    clean: true,
  });

  mqttClient.on('connect', () => {
    console.log(`[backend] conectado como ${clientId}`);
    const topicsToSub = [config.topics.allSpotEvents, config.topics.allGatewayStatus];
    mqttClient.subscribe(topicsToSub, { qos: 1 }, (err, granted) => {
      if (err) return console.error('[backend] erro no subscribe:', err.message);
      granted.forEach((g) =>
        console.log(`[backend] subscrito em ${g.topic} (qos ${g.qos})`)
      );
    });
  });

  recommendationEngine.setMqttPublisher((topic, payload) => {
    mqttClient.publish(topic, payload, { qos: 1 });
  });

  mqttClient.on('error', (err) => console.error('[backend] erro MQTT:', err.message));
  mqttClient.on('reconnect', () => console.log('[backend] reconectando...'));

  mqttClient.on('message', (topic, msgBuf) => {
    const msg = msgBuf.toString();
    if (topic.endsWith('/events')) {
      handleSpotEvent(topic, msg).catch((err) =>
        console.error('[backend] erro processando evento:', err.message)
      );
    } else if (topic.endsWith('/gateway/status')) {
      handleGatewayStatus(topic, msg).catch((err) =>
        console.error('[backend] erro processando status:', err.message)
      );
    }
  });

  // 5) Log de saude periodico
  healthInterval = setInterval(async () => {
    try {
      const dbStats = await db.getStats();
      console.log(
        `[backend] recv=${stats.eventsReceived} inseridos=${stats.eventsInserted} ` +
          `duplicados=${stats.eventsDuplicates} invalidos=${stats.eventsInvalid} | ` +
          `DB events=${dbStats.totalEventos} spots=${dbStats.totalSpotsConhecidas} ` +
          `ocup=${dbStats.ocupadas}/${dbStats.totalSpotsConhecidas} snapshots=${dbStats.snapshots}`
      );
    } catch (err) {
      console.warn('[backend] falha ao ler stats:', err.message);
    }
  }, 5000);
}

// ---------- Shutdown gracioso ----------
async function shutdown() {
  console.log('\n[backend] encerrando...');
  if (healthInterval) clearInterval(healthInterval);
  stopSnapshotter();
  try {
    if (mqttClient) await new Promise((r) => mqttClient.end(true, {}, r));
    await closePool();
  } catch (err) {
    console.warn('[backend] erro no shutdown:', err.message);
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((err) => {
  console.error('[backend] falha no boot:', err.message);
  process.exit(1);
});
