// public/js/render/map.js
// Renderiza o grid 3x30 de vagas. Cada vaga ganha:
//   - data-state (FREE/OCCUPIED/UNKNOWN) -> cor de fundo
//   - data-incident="true" se ha incidente aberto -> tom laranja
//   - tooltip ao passar mouse com spotId/state/lastTs/lastSource
//
// data: payload de GET /api/v1/map -> { ts, sectors: [{ sectorId, spots: [...]}, ...] }
// incidents: payload de GET /api/v1/incidents?status=open -> { incidents: [...] }

function buildSpot(spot, incidentSpots) {
  const hasIncident = incidentSpots.has(spot.spotId);
  const lastTs = spot.lastTs ? new Date(spot.lastTs).toISOString() : '—';
  return `
    <div
      class="spot"
      data-state="${spot.state}"
      data-incident="${hasIncident}"
      data-spot-id="${spot.spotId}"
      data-last-ts="${lastTs}"
      data-last-source="${spot.lastSource || '—'}"
    ></div>
  `;
}

export function renderMap(mapData, incidentsData, root) {
  if (!mapData || !Array.isArray(mapData.sectors)) {
    root.innerHTML = '';
    return;
  }

  // Set de spotIds com incidente aberto, pra colorir o grid
  const incidentSpots = new Set();
  if (incidentsData && Array.isArray(incidentsData.incidents)) {
    for (const inc of incidentsData.incidents) {
      if (inc.spotId) incidentSpots.add(inc.spotId);
    }
  }

  root.innerHTML = mapData.sectors
    .map((sector) => `
      <div class="map-row">
        <span class="map-row-label">${sector.sectorId}</span>
        <div class="map-spots">
          ${sector.spots.map((s) => buildSpot(s, incidentSpots)).join('')}
        </div>
      </div>
    `)
    .join('');
}

// ---------- Tooltip (delegado por evento, anexado uma vez) ----------

const tooltipEl = () => document.getElementById('tooltip');

export function attachSpotTooltip(root) {
  root.addEventListener('mouseover', (e) => {
    const spot = e.target.closest('.spot');
    if (!spot) return;
    const tip = tooltipEl();
    if (!tip) return;
    const id     = spot.dataset.spotId;
    const state  = spot.dataset.state;
    const ts     = spot.dataset.lastTs;
    const source = spot.dataset.lastSource;
    const inc    = spot.dataset.incident === 'true' ? '<div class="tooltip-row"><span class="tooltip-key">incidente:</span><span>aberto</span></div>' : '';
    tip.innerHTML = `
      <div class="tooltip-row"><span class="tooltip-key">vaga:</span>   <span>${id}</span></div>
      <div class="tooltip-row"><span class="tooltip-key">estado:</span> <span>${state}</span></div>
      <div class="tooltip-row"><span class="tooltip-key">ts:</span>     <span>${ts}</span></div>
      <div class="tooltip-row"><span class="tooltip-key">fonte:</span>  <span>${source}</span></div>
      ${inc}
    `;
    positionTooltip(tip, spot);
    tip.classList.add('visible');
  });
  root.addEventListener('mouseout', (e) => {
    if (e.target.closest('.spot')) {
      tooltipEl()?.classList.remove('visible');
    }
  });
}

function positionTooltip(tip, target) {
  const rect = target.getBoundingClientRect();
  const tipW = tip.offsetWidth || 200;
  const tipH = tip.offsetHeight || 80;
  let x = rect.left + rect.width / 2 - tipW / 2;
  let y = rect.top - tipH - 8;
  // Mantem dentro da viewport
  x = Math.max(8, Math.min(window.innerWidth - tipW - 8, x));
  if (y < 8) y = rect.bottom + 8;
  tip.style.left = `${x}px`;
  tip.style.top  = `${y}px`;
}
