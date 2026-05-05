// src/backend/snapshotter.js
// Job periodico que escreve snapshots por setor em sector_snapshots.
//
// Etapa 3 do spec: "sector_snapshots (ts, sectorId, occupiedCount, freeCount,
// occupancyRate) — pode ser por minuto". Roda no boot do backend e deve ser
// parado no shutdown via stopSnapshotter().

const config = require('../config');
const db = require('./db');

let timer = null;

async function tick() {
  for (const sectorId of config.sectors) {
    try {
      const occ = await db.getSectorOccupancy(sectorId);
      await db.saveSectorSnapshot({
        sectorId,
        occupiedCount: occ.occupiedCount,
        freeCount: occ.freeCount,
        occupancyRate: occ.occupancyRate,
      });
    } catch (err) {
      console.warn(`[snapshot] falha em ${sectorId}: ${err.message}`);
    }
  }
}

function startSnapshotter(intervalMs = config.snapshotIntervalMs) {
  if (timer) return;
  console.log(`[snapshot] iniciando (a cada ${intervalMs}ms)`);
  // Primeiro tick imediato pra nao esperar 1 minuto na demo
  tick();
  timer = setInterval(tick, intervalMs);
}

function stopSnapshotter() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = { startSnapshotter, stopSnapshotter };
