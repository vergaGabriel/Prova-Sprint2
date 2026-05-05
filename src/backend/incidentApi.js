// src/backend/incidentApi.js
// API HTTP da Etapa 6 — endpoints de incidentes.
//
// Expoe (montado em /api/v1 pelo httpApi.js):
//   GET /incidents              lista todos (filtros via query)
//   GET /incidents/:id          detalhe de um incidente
//   GET /incidents/stats        contagens (util pra demo)
//
// Query params em GET /incidents:
//   ?status=open|closed
//   ?type=STUCK_OCCUPIED|STUCK_FREE|FLAPPING
//   ?sectorId=A
//   ?spotId=A-07

const express = require('express');
const { incidentDb } = require('./incidents');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const router = express.Router();

// Rota /stats antes de /:id pra nao ser capturada como id
router.get(
  '/incidents/stats',
  asyncHandler(async (_req, res) => {
    res.json(await incidentDb.getStats());
  })
);

router.get(
  '/incidents',
  asyncHandler(async (req, res) => {
    const { status, type, sectorId, spotId } = req.query;

    if (status && !['open', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'status deve ser "open" ou "closed"' });
    }
    const TIPOS_VALIDOS = ['STUCK_OCCUPIED', 'STUCK_FREE', 'FLAPPING'];
    if (type && !TIPOS_VALIDOS.includes(type)) {
      return res
        .status(400)
        .json({ error: `type deve ser um de: ${TIPOS_VALIDOS.join(', ')}` });
    }

    const lista = await incidentDb.getIncidents({ status, type, sectorId, spotId });

    res.json({
      total: lista.length,
      filters: { status, type, sectorId, spotId },
      incidents: lista,
    });
  })
);

router.get(
  '/incidents/:id',
  asyncHandler(async (req, res) => {
    const inc = await incidentDb.getIncidentById(req.params.id);
    if (!inc) {
      return res
        .status(404)
        .json({ error: `incidente ${req.params.id} nao encontrado` });
    }
    res.json(inc);
  })
);

module.exports = { router };
