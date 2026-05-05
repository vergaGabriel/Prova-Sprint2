// src/simulator/index.js
// Entry point do simulador. Junta tudo:
//   1. Cria 90 sensores (matriz 3x30) + 3 gateways (cada gateway = 1 cliente MQTT)
//   2. Cada gateway tem seu Last Will configurado pra publicar offline se cair
//   3. Inicia o loop de tick (1 minuto simulado por tick)
//   4. Inicia monitor (detector de falhas + alerta 80%)
//   5. Inicia HTTP de controle (injecao de falhas)

const config = require('../config');
const { listAllSpots } = require('./layout');
const { Sensor } = require('./sensor');
const { Gateway } = require('./gateway');
const { Monitor } = require('./monitor');
const { startControlServer } = require('./controlServer');

console.log('========================================');
console.log('  SIMULADOR DE ESTACIONAMENTO INTELIGENTE');
console.log('========================================');
console.log(`Broker:     ${config.mqttUrl}`);
console.log(`Namespace:  ${config.namespace || '(vazio - topicos exatos do spec)'}`);
console.log(`Tick:       ${config.tickMs}ms = 1 min simulado`);
console.log(`Setores:    ${config.sectors.join(', ')}`);
console.log(`Vagas:      ${config.sectors.length * config.spotsPerSector}`);
console.log('');

// ========== 1) Sensores (matriz 3x30) ==========
const sensorsByKey = {};
const sensorsBySector = {};

for (const { sectorId, spotId } of listAllSpots()) {
  const s = new Sensor({ sectorId, spotId });
  sensorsByKey[spotId] = s;
  if (!sensorsBySector[sectorId]) sensorsBySector[sectorId] = [];
  sensorsBySector[sectorId].push(s);
}

// ========== 2) Gateways (1 por setor, cada um com cliente MQTT proprio + LWT) ==========
const gateways = {};
for (const sectorId of config.sectors) {
  gateways[sectorId] = new Gateway({
    sectorId,
    sensors: sensorsBySector[sectorId],
  });
}

// ========== 3) Monitor (detector + alerta 80%) ==========
const monitor = new Monitor({ sensorsByKey, sensorsBySector, gateways });

// ========== 4) Relogio simulado ==========
let simTime = new Date();
let simMinute = 0;

function avancarRelogio() {
  simTime = new Date(simTime.getTime() + 60 * 1000);
  simMinute++;
}

// ========== 5) Loop principal ==========
let totalEventos = 0;

function tick() {
  avancarRelogio();
  const hora = simTime.getHours();

  for (const sensor of Object.values(sensorsByKey)) {
    const { changed, newState } = sensor.tick(hora);
    if (changed) {
      gateways[sensor.sectorId].publishSpotEvent({
        spotId: sensor.spotId,
        state: newState,
        source: sensor.fault ? 'gateway' : 'sensor',
      });
      totalEventos++;
      monitor.registrarMudanca(sensor.spotId, simMinute);
      monitor.limparReporte(sensor.spotId);
    }
  }

  monitor.verificar(simMinute);
}

function publicarSnapshotInicial() {
  for (const sensor of Object.values(sensorsByKey)) {
    gateways[sensor.sectorId].publishSpotEvent({
      spotId: sensor.spotId,
      state: sensor.state,
      source: 'gateway',
    });
    totalEventos++;
  }
  console.log(`[sim] snapshot inicial publicado (${totalEventos} eventos)`);
}

// ========== 6) Espera os 3 gateways conectarem, ai inicia tudo ==========
async function startSimulationLoops() {
  await Promise.all(Object.values(gateways).map((g) => g.whenConnected()));
  console.log('[sim] todos os 3 gateways conectados');

  setTimeout(() => {
    publicarSnapshotInicial();
    setInterval(tick, config.tickMs);
  }, 1000);

  for (const sectorId of config.sectors) gateways[sectorId].publishStatus('online');
  setInterval(() => {
    for (const sectorId of config.sectors) gateways[sectorId].publishStatus('online');
  }, config.gatewayStatusIntervalS * 1000);
}
startSimulationLoops();

// ========== 7) HTTP de controle (modo de teste) ==========
startControlServer({
  sensorsByKey,
  sensorsBySector,
  getSimTime: () => simTime.toISOString(),
});

// ========== 8) Log de status no console a cada 5s ==========
setInterval(() => {
  const ocupadas = Object.values(sensorsByKey).filter((s) => s.state === 'OCCUPIED').length;
  const falhas = Object.values(sensorsByKey).filter((s) => s.fault).length;
  console.log(
    `[sim] simTime=${simTime.toISOString()} ` +
      `ocupadas=${ocupadas}/90 falhas=${falhas} eventos=${totalEventos}`
  );
}, 5000);

// ========== 9) Shutdown gracioso ==========
async function shutdown() {
  console.log('\n[sim] encerrando... publicando offline em todos os gateways');
  await Promise.all(Object.values(gateways).map((g) => g.shutdown()));
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
