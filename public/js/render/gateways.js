// public/js/render/gateways.js
// Renderiza as bolinhas de status de cada gateway (A, B, C) no topbar.
//
// data: payload de GET /api/v1/gateways
//       -> { gateways: [{ sectorId, status, payload, receivedAt }, ...] }

const SECTORS = ['A', 'B', 'C'];

function statusOf(item) {
  if (!item || !item.status)            return 'unknown';
  if (item.status === 'online')         return 'online';
  if (item.status === 'offline')        return 'offline';
  return 'unknown';
}

export function renderGateways(data, root) {
  const bySector = new Map(
    (data?.gateways || []).map((g) => [g.sectorId, g])
  );
  root.innerHTML = SECTORS
    .map((sectorId) => {
      const item   = bySector.get(sectorId);
      const status = statusOf(item);
      return `
        <span class="gateway" data-status="${status}" title="gateway ${sectorId}: ${status}">
          <span class="gateway-dot"></span>
          <span>${sectorId}</span>
        </span>
      `;
    })
    .join('');
}
