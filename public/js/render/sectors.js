// public/js/render/sectors.js
// Renderiza os 3 cards de setor (A, B, C) no topo do dashboard.
// data: payload de GET /api/v1/sectors -> { ts, sectors: [...] }

function classifyOccupancy(rate) {
  if (rate >= 0.9) return { state: 'full',   label: 'lotado'      };
  if (rate >= 0.7) return { state: 'busy',   label: 'movimentado' };
  return                  { state: 'ok',     label: 'disponivel'  };
}

export function renderSectors(data, root) {
  if (!data || !Array.isArray(data.sectors)) {
    root.innerHTML = '';
    return;
  }
  root.innerHTML = data.sectors
    .map((s) => {
      const cls = classifyOccupancy(s.occupancyRate);
      const pct = (s.occupancyRate * 100).toFixed(0);
      return `
        <div class="sector-card" data-state="${cls.state}">
          <div class="sector-card-header">
            <span class="sector-letter">Setor ${s.sectorId}</span>
            <span class="sector-badge" data-state="${cls.state}">${cls.label}</span>
          </div>
          <div class="sector-numbers">
            <span class="sector-count">${s.occupiedCount}</span>
            <span class="sector-total">/ ${s.total} ocupadas</span>
          </div>
          <span class="sector-rate">${pct}% &middot; ${s.freeCount} livres</span>
        </div>
      `;
    })
    .join('');
}
