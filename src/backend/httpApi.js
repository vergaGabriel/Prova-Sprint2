// src/backend/httpApi.js
// API HTTP unificada do backend (etapas 4, 5 e 6).
//
// Endpoints expostos sob /api/v1:
//
//   ----- ETAPA 4 (consulta) -----
//   GET /map                                  mapa atual (setores + vagas + estado)
//   GET /sectors                              resumo por setor (occ/free/rate/lastUpdateTs)
//   GET /sectors/:sectorId/spots              vagas de um setor
//   GET /sectors/:sectorId/free-spots?limit   vagas livres de um setor
//
//   ----- ETAPA 4 (relatorios) -----
//   GET /reports/turnover?sectorId=&from=&to=  transicoes FREE->OCCUPIED
//
//   ----- ETAPA 5 (recomendacao) -----
//   GET /recommendation?fromSector=A          calcula recomendacao on-demand
//   GET /recommendations                      historico (recommendations_log)
//
//   ----- ETAPA 6 (incidentes) -----
//   GET /incidents                            via router de incidentApi.js
//   GET /incidents/:id
//   GET /incidents/stats
//
// Tudo num so servidor Express (porta config.apiPort, padrao 4001).

const express = require('express');
const config = require('../config');
const db = require('./db');
const { recommendationEngine } = require('./recommendations');
const { router: incidentRouter } = require('./incidentApi');

// Wrapper pra propagar erros de handlers async ao middleware do Express.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function buildRouter() {
  const router = express.Router();

  // ============================================================
  // ETAPA 4 - Consulta
  // ============================================================

  router.get(
    '/map',
    asyncHandler(async (_req, res) => {
      res.json(await db.getMap());
    })
  );

  router.get(
    '/sectors',
    asyncHandler(async (_req, res) => {
      res.json({
        ts: new Date().toISOString(),
        sectors: await db.getSectorsSummary(),
      });
    })
  );

  router.get(
    '/sectors/:sectorId/spots',
    asyncHandler(async (req, res) => {
      const sectorId = String(req.params.sectorId).toUpperCase();
      if (!config.sectors.includes(sectorId)) {
        return res.status(404).json({ error: `setor ${sectorId} nao existe` });
      }
      const occ = await db.getSectorOccupancy(sectorId);
      res.json({
        sectorId,
        ...occ,
        spots: await db.getSectorSpots(sectorId),
      });
    })
  );

  router.get(
    '/sectors/:sectorId/free-spots',
    asyncHandler(async (req, res) => {
      const sectorId = String(req.params.sectorId).toUpperCase();
      if (!config.sectors.includes(sectorId)) {
        return res.status(404).json({ error: `setor ${sectorId} nao existe` });
      }
      const rawLimit =
        req.query.limit !== undefined ? parseInt(req.query.limit, 10) : undefined;
      if (rawLimit !== undefined && (!Number.isFinite(rawLimit) || rawLimit < 0)) {
        return res.status(400).json({ error: 'limit deve ser inteiro >= 0' });
      }
      const livres = await db.getFreeSpots(sectorId, rawLimit);
      res.json({
        sectorId,
        limit: rawLimit ?? null,
        count: livres.length,
        freeSpots: livres,
      });
    })
  );

  // ============================================================
  // ETAPA 4 - Relatorios
  // ============================================================

  router.get(
    '/reports/turnover',
    asyncHandler(async (req, res) => {
      const { sectorId, from, to } = req.query;

      if (sectorId && !config.sectors.includes(String(sectorId).toUpperCase())) {
        return res.status(400).json({ error: `setor ${sectorId} invalido` });
      }
      for (const [name, val] of [['from', from], ['to', to]]) {
        if (val && Number.isNaN(Date.parse(val))) {
          return res.status(400).json({ error: `${name} invalido (use ISO 8601)` });
        }
      }

      const result = await db.getTurnoverCount({
        sectorId: sectorId ? String(sectorId).toUpperCase() : undefined,
        from: from || undefined,
        to: to || undefined,
      });
      res.json(result);
    })
  );

  // ============================================================
  // ETAPA 5 - Recomendacao
  // ============================================================

  router.get(
    '/recommendation',
    asyncHandler(async (req, res) => {
      const fromSector = req.query.fromSector
        ? String(req.query.fromSector).toUpperCase()
        : null;
      if (!fromSector) {
        return res.status(400).json({ error: 'fromSector e obrigatorio' });
      }
      if (!config.sectors.includes(fromSector)) {
        return res.status(404).json({ error: `setor ${fromSector} nao existe` });
      }
      const reco = await recommendationEngine.compute(fromSector);
      if (!reco) {
        return res.status(404).json({ error: 'nao foi possivel calcular recomendacao' });
      }
      res.json(reco);
    })
  );

  router.get(
    '/recommendations',
    asyncHandler(async (req, res) => {
      const fromSector = req.query.fromSector
        ? String(req.query.fromSector).toUpperCase()
        : undefined;
      const rawLimit =
        req.query.limit !== undefined ? parseInt(req.query.limit, 10) : undefined;
      const lista = await db.getRecommendations({ fromSector, limit: rawLimit });
      res.json({ total: lista.length, recommendations: lista });
    })
  );

  // ============================================================
  // Saude dos gateways (alimenta as bolinhas do dashboard)
  // ============================================================
  router.get(
    '/gateways',
    asyncHandler(async (_req, res) => {
      res.json({ gateways: await db.getGatewayStatuses() });
    })
  );

  // ============================================================
  // ETAPA 6 - Incidentes (router pre-existente)
  // ============================================================
  router.use('/', incidentRouter);

  return router;
}

function startHttpApi(port = config.apiPort) {
  const app = express();
  const path = require('path');
  app.use(express.json());

  // Dashboard estatico (light mode, sem build) servido em /
  app.use(express.static(path.join(__dirname, '..', '..', 'public')));

  app.use('/api/v1', buildRouter());

  app.get('/health', (_req, res) =>
    res.json({ ok: true, service: 'parking-api', ts: new Date().toISOString() })
  );

  // Middleware de erro: captura excecoes de handlers async
  app.use((err, _req, res, _next) => {
    console.error('[api] erro:', err.message);
    res.status(500).json({ error: err.message });
  });

  app.listen(port, () => {
    console.log(`[api] HTTP ouvindo em http://localhost:${port}`);
    console.log(`[api]   Dashboard: http://localhost:${port}/`);
    console.log(`[api]   GET /api/v1/map`);
    console.log(`[api]   GET /api/v1/sectors`);
    console.log(`[api]   GET /api/v1/sectors/:id/spots`);
    console.log(`[api]   GET /api/v1/sectors/:id/free-spots?limit=10`);
    console.log(`[api]   GET /api/v1/reports/turnover?sectorId=A&from=&to=`);
    console.log(`[api]   GET /api/v1/recommendation?fromSector=A`);
    console.log(`[api]   GET /api/v1/recommendations`);
    console.log(`[api]   GET /api/v1/incidents?status=open`);
  });

  return app;
}

module.exports = { buildRouter, startHttpApi };
