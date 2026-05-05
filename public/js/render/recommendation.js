// public/js/render/recommendation.js
// Mostra um banner com a recomendacao mais recente, mas SO se ela for "fresca"
// (criada nos ultimos N segundos). Caso contrario, esconde o banner.
//
// data: payload de GET /api/v1/recommendations?limit=1
//       -> { total, recommendations: [{ ts, fromSector, recommendedSector, reason }, ...] }

import { icons } from '../icons.js';

const FRESH_WINDOW_MS = 30_000; // 30s

export function renderRecommendation(data, root) {
  if (!data || !Array.isArray(data.recommendations) || data.recommendations.length === 0) {
    root.classList.add('hidden');
    root.innerHTML = '';
    return;
  }
  const reco = data.recommendations[0];
  const ageMs = Date.now() - new Date(reco.ts).getTime();

  if (ageMs > FRESH_WINDOW_MS) {
    root.classList.add('hidden');
    root.innerHTML = '';
    return;
  }

  root.classList.remove('hidden');
  root.innerHTML = `
    <div class="recommendation-icon">${icons.alertTriangle}</div>
    <div class="recommendation-body">
      <div class="recommendation-title">Recomendacao R-OP1 ativa</div>
      <div class="recommendation-text">${reco.reason}</div>
      <div class="recommendation-meta">${reco.ts}</div>
    </div>
  `;
}
