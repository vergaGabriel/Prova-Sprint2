// src/config.js
// Configuracao central do simulador.
// Le do .env e expoe constantes + funcoes para montar topicos MQTT.

require('dotenv').config();

// Namespace opcional. Se TOPIC_NAMESPACE estiver vazio no .env, usa os
// topicos EXATOS exigidos pela prova:
//   campus/parking/sectors/<sectorId>/spots/<spotId>/events
//   campus/parking/sectors/<sectorId>/gateway/status
//
// Quando estamos no broker publico (HiveMQ/Mosquitto demo), defina um
// namespace pra evitar colisao com outros alunos. Em apresentacao com
// Mosquitto local, deixe vazio pra bater 100% com o spec.
const NAMESPACE = (process.env.TOPIC_NAMESPACE || '').trim();
const ROOT = NAMESPACE
  ? `${NAMESPACE}/campus/parking`
  : 'campus/parking';

module.exports = {
  mqttUrl: process.env.MQTT_URL || 'mqtt://broker.hivemq.com:1883',
  namespace: NAMESPACE,

  // Layout obrigatorio
  sectors: ['A', 'B', 'C'],
  spotsPerSector: 30,

  // Velocidade da simulacao
  tickMs: parseInt(process.env.TICK_MS || '1000', 10),
  gatewayStatusIntervalS: parseInt(process.env.GATEWAY_STATUS_INTERVAL_S || '15', 10),

  // HTTP de controle (injecao de falhas)
  simControlPort: parseInt(process.env.SIM_CONTROL_PORT || '4000', 10),

  // Limite pra alerta de setor cheio (simulador)
  alertThreshold: 0.8, // 80%

  // Limite pra recomendar troca de setor (R-OP1, etapa 5)
  recommendationThreshold: 0.9, // 90%

  // Porta da API HTTP do backend (etapa 4)
  apiPort: parseInt(process.env.API_PORT || '4001', 10),

  // Postgres (Etapa 3)
  databaseUrl: process.env.DATABASE_URL || 'postgres://parking:parking@localhost:5432/parking',

  // Snapshot de setor por minuto (Etapa 3 / sector_snapshots)
  snapshotIntervalMs: parseInt(process.env.SNAPSHOT_INTERVAL_MS || '60000', 10),

  // ===== Incidentes (Etapa 6) =====
  // Os limiares abaixo sao em TEMPO REAL (ms reais), porque o `ts` do payload
  // e gerado com `new Date()` no gateway. Para a demo, valores curtos sao mais
  // praticos; em producao, ajuste pra 8h / 60min via .env.
  //
  // STUCK: vaga sem mudar de estado por mais que stuckThresholdMs.
  stuckThresholdMs: parseInt(process.env.STUCK_THRESHOLD_MS || String(8 * 60 * 60 * 1000), 10),
  // Intervalo do scanner que varre `spots` em busca de STUCK.
  stuckScanIntervalMs: parseInt(process.env.STUCK_SCAN_INTERVAL_MS || '5000', 10),
  // FLAPPING: > flappingMaxChanges trocas em uma janela de flappingWindowMs.
  flappingWindowMs: parseInt(process.env.FLAPPING_WINDOW_MS || '60000', 10),
  flappingMaxChanges: parseInt(process.env.FLAPPING_MAX_CHANGES || '6', 10),
  // Graca apos o boot pra evitar disparos espurios enquanto o sistema estabiliza.
  incidentStartupGraceMs: parseInt(process.env.INCIDENT_STARTUP_GRACE_MS || '30000', 10),

  // Topicos MQTT (montados dinamicamente)
  topics: {
    // ----- publishers (simulador) -----
    spotEvents: (sectorId, spotId) =>
      `${ROOT}/sectors/${sectorId}/spots/${spotId}/events`,
    gatewayStatus: (sectorId) =>
      `${ROOT}/sectors/${sectorId}/gateway/status`,
    sectorAlerts: (sectorId) =>
      `${ROOT}/sectors/${sectorId}/alerts`,

    // ----- publisher (backend) -----
    recommendations: `${ROOT}/recommendations`,

    // ----- subscribers (backend) - wildcards -----
    allSpotEvents: `${ROOT}/sectors/+/spots/+/events`,
    allGatewayStatus: `${ROOT}/sectors/+/gateway/status`,
  },
};
