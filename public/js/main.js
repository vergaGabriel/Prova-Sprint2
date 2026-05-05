// public/js/main.js
// Bootstrap do dashboard:
//   1) faz primeira leitura imediata
//   2) inicia loop de polling de 5s
//   3) plumbing dos eventos (tooltip, controles)
//
// Mantem os arquivos render/* com responsabilidade unica e o orquestrador
// (main) sem logica de negocio — so coordena fetch -> render.

import { icons } from './icons.js';
import {
  getMap,
  getSectors,
  getIncidents,
  getGateways,
  getRecentReco,
} from './api.js';
import { renderSectors }       from './render/sectors.js';
import { renderMap, attachSpotTooltip } from './render/map.js';
import { renderRecommendation } from './render/recommendation.js';
import { renderIncidents }     from './render/incidents.js';
import { renderGateways }      from './render/gateways.js';
import { setupControls }       from './controls.js';

const POLL_MS = 5000;

const els = {
  health:        document.getElementById('health'),
  healthIcon:    document.getElementById('health-icon'),
  healthLabel:   document.getElementById('health-label'),
  gateways:      document.getElementById('gateways'),
  sectors:       document.getElementById('sectors-root'),
  map:           document.getElementById('map-root'),
  recommendation:document.getElementById('recommendation-root'),
  incidents:     document.getElementById('incidents-root'),
  incidentsTitle:document.getElementById('incidents-title'),
  controls:      document.getElementById('controls-root'),
  toasts:        document.getElementById('toasts'),
};

// ---------- Toast helper ----------

function showToast(message, kind = 'info') {
  const t = document.createElement('div');
  t.className = 'toast';
  t.dataset.kind = kind;
  t.textContent = message;
  els.toasts.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ---------- Health indicator ----------

function setHealth(state, label) {
  els.health.dataset.state = state;
  els.healthLabel.textContent = label;
  els.healthIcon.innerHTML = icons.activity;
}

// ---------- Loop de polling ----------

async function tick() {
  try {
    const [mapData, sectorsData, incidentsData, gatewaysData, recoData] =
      await Promise.all([
        getMap(),
        getSectors(),
        getIncidents(),
        getGateways(),
        getRecentReco(),
      ]);

    setHealth('ok', 'Backend conectado');
    renderSectors(sectorsData, els.sectors);
    renderMap(mapData, incidentsData, els.map);
    renderIncidents(incidentsData, els.incidents, els.incidentsTitle);
    renderGateways(gatewaysData, els.gateways);
    renderRecommendation(recoData, els.recommendation);
  } catch (err) {
    setHealth('error', `Erro: ${err.message}`);
  }
}

// ---------- Bootstrap ----------

attachSpotTooltip(els.map);
setupControls(els.controls, { showToast });
setHealth('unknown', 'Conectando...');

tick();
setInterval(tick, POLL_MS);
