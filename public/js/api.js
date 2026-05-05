// public/js/api.js
// Wrappers fetch para os endpoints HTTP do backend (:4001) e do simulador (:4000).
// Todas as funcoes retornam Promise com o JSON parseado, ou lancam erro descritivo.

const API = '/api/v1';
const CONTROL = 'http://localhost:4000';

async function jsonFetch(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) {
    let body = '';
    try { body = await res.text(); } catch {}
    throw new Error(`${res.status} ${res.statusText}: ${body || url}`);
  }
  return res.json();
}

// ---------- Backend (porta 4001) ----------

export const getMap          = () => jsonFetch(`${API}/map`);
export const getSectors      = () => jsonFetch(`${API}/sectors`);
export const getIncidents    = () => jsonFetch(`${API}/incidents?status=open`);
export const getGateways     = () => jsonFetch(`${API}/gateways`);
export const getRecentReco   = () => jsonFetch(`${API}/recommendations?limit=1`);
export const getHealth       = () => jsonFetch('/health');

// ---------- Simulador / control server (porta 4000) ----------

export function injectFault({ spotId, sectorId, fault }) {
  const body = fault ? { fault } : {};
  if (spotId)   body.spotId   = spotId;
  if (sectorId) body.sectorId = sectorId;
  return jsonFetch(`${CONTROL}/faults`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
}

export function clearFaults({ spotId, sectorId } = {}) {
  const params = new URLSearchParams();
  if (spotId)   params.set('spotId', spotId);
  if (sectorId) params.set('sectorId', sectorId);
  const q = params.toString();
  return jsonFetch(`${CONTROL}/faults${q ? '?' + q : ''}`, { method: 'DELETE' });
}
