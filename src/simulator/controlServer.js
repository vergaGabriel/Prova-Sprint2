// src/simulator/controlServer.js
// HTTP de controle do simulador (modo de teste).
// Permite ao avaliador:
//   - Ver o estado atual de todas as vagas
//   - Injetar falhas (stuck_occupied, stuck_free, flapping)
//   - Limpar falhas

const express = require('express');
const config = require('../config');

const FALHAS_VALIDAS = ['stuck_occupied', 'stuck_free', 'flapping'];

function startControlServer({ sensorsByKey, sensorsBySector, getSimTime }) {
  const app = express();
  app.use(express.json());

  // CORS aberto: o dashboard servido em :4001 precisa chamar este servico (:4000)
  // pra injetar/limpar falhas. So expomos endpoints de teste, sem dado sensivel.
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // ------------ GET /health ------------
  app.get('/health', (_req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
  });

  // ------------ GET /state ------------
  // Snapshot completo do simulador
  app.get('/state', (_req, res) => {
    const lista = Object.values(sensorsByKey).map((s) => ({
      sectorId: s.sectorId,
      spotId: s.spotId,
      state: s.state,
      fault: s.fault,
      dwellRestante: s.dwell,
    }));
    res.json({
      simTime: getSimTime(),
      total: lista.length,
      ocupadas: lista.filter((x) => x.state === 'OCCUPIED').length,
      livres: lista.filter((x) => x.state === 'FREE').length,
      comFalha: lista.filter((x) => x.fault).length,
      vagas: lista,
    });
  });

  // ------------ GET /state/:sectorId ------------
  // Snapshot apenas de um setor
  app.get('/state/:sectorId', (req, res) => {
    const sectorId = req.params.sectorId.toUpperCase();
    const sensors = sensorsBySector[sectorId];
    if (!sensors) return res.status(404).json({ error: `setor ${sectorId} nao existe` });
    const lista = sensors.map((s) => ({
      spotId: s.spotId,
      state: s.state,
      fault: s.fault,
      dwellRestante: s.dwell,
    }));
    const ocupadas = lista.filter((x) => x.state === 'OCCUPIED').length;
    res.json({
      sectorId,
      total: lista.length,
      ocupadas,
      livres: lista.length - ocupadas,
      ocupacaoPct: parseFloat(((ocupadas / lista.length) * 100).toFixed(1)),
      vagas: lista,
    });
  });

  // ------------ POST /faults ------------
  // body: { spotId?: "A-07", sectorId?: "B", fault: "stuck_occupied"|"stuck_free"|"flapping" }
  app.post('/faults', (req, res) => {
    const { spotId, sectorId, fault } = req.body || {};
    if (!FALHAS_VALIDAS.includes(fault)) {
      return res.status(400).json({
        error: `fault deve ser um de: ${FALHAS_VALIDAS.join(', ')}`,
      });
    }

    const afetadas = [];

    if (spotId) {
      const sensor = sensorsByKey[spotId];
      if (!sensor) return res.status(404).json({ error: `vaga ${spotId} nao existe` });
      sensor.setFault(fault);
      afetadas.push(spotId);
    } else if (sectorId) {
      const upper = sectorId.toUpperCase();
      const sensors = sensorsBySector[upper];
      if (!sensors) return res.status(404).json({ error: `setor ${upper} nao existe` });
      sensors.forEach((s) => {
        s.setFault(fault);
        afetadas.push(s.spotId);
      });
    } else {
      return res.status(400).json({ error: 'informe spotId ou sectorId' });
    }

    console.log(`[control] FALHA INJETADA: ${fault} em ${afetadas.length} vaga(s)`);
    res.json({ ok: true, fault, afetadas });
  });

  // ------------ DELETE /faults ------------
  // query: ?spotId=A-07  ou  ?sectorId=A   (sem param = limpa tudo)
  app.delete('/faults', (req, res) => {
    const { spotId, sectorId } = req.query;
    const limpas = [];

    if (spotId) {
      const sensor = sensorsByKey[spotId];
      if (!sensor) return res.status(404).json({ error: `vaga ${spotId} nao existe` });
      sensor.clearFault();
      limpas.push(spotId);
    } else if (sectorId) {
      const upper = String(sectorId).toUpperCase();
      const sensors = sensorsBySector[upper];
      if (!sensors) return res.status(404).json({ error: `setor ${upper} nao existe` });
      sensors.forEach((s) => {
        if (s.fault) {
          s.clearFault();
          limpas.push(s.spotId);
        }
      });
    } else {
      Object.values(sensorsByKey).forEach((s) => {
        if (s.fault) {
          s.clearFault();
          limpas.push(s.spotId);
        }
      });
    }

    console.log(`[control] falhas limpas em ${limpas.length} vaga(s)`);
    res.json({ ok: true, limpas });
  });

  app.listen(config.simControlPort, () => {
    console.log(
      `[control] HTTP ouvindo em http://localhost:${config.simControlPort}`
    );
  });

  return app;
}

module.exports = { startControlServer };
