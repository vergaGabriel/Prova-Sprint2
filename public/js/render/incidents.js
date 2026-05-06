// public/js/render/incidents.js

function formatRelativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `ha ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `ha ${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `ha ${hr}h`;
  const day = Math.floor(hr / 24);
  return `ha ${day}d`;
}

function formatJanela(ms) {
  if (!ms) return '?';

  const min = Math.round(ms / 60000);

  if (min < 60) return `${min}min`;

  const horas = min / 60;
  return `${Number.isInteger(horas) ? horas : horas.toFixed(1)}h`;
}

function describe(inc) {
  const ev = inc.evidenceJson || {};

  switch (inc.type) {
    case 'FLAPPING':
      return {
        title: 'Sensor instavel (oscilando)',
        detail: `${ev.trocasNaJanela ?? '?'} trocas em ${formatJanela(ev.janelaMs)} — provavel ruido ou mau contato`,
      };

    case 'STUCK_OCCUPIED':
      return {
        title: 'Travada em OCUPADA',
        detail: `sem mudar de estado ha ${ev.tempoSemMudarHoras ?? '?'}h — sensor pode estar com defeito`,
      };

    case 'STUCK_FREE':
      return {
        title: 'Travada em LIVRE',
        detail: `sem mudar de estado ha ${ev.tempoSemMudarHoras ?? '?'}h — sensor talvez sem reportar`,
      };

    default:
      return { title: inc.type, detail: '' };
  }
}

export function renderIncidents(data, listRoot, titleEl) {
  const total = data?.total ?? 0;

  if (titleEl) {
    titleEl.textContent = total > 0
      ? `Incidentes abertos (${total})`
      : 'Incidentes abertos';
  }

  if (!data || !Array.isArray(data.incidents) || data.incidents.length === 0) {
    listRoot.innerHTML = `<div class="incidents-empty">nenhum incidente aberto</div>`;
    return;
  }

  listRoot.innerHTML = data.incidents
    .map((inc) => {
      const d = describe(inc);

      return `
        <div class="incident-row">
          <span class="incident-spot">${inc.spotId || inc.sectorId}</span>
          <div class="incident-body">
            <div class="incident-title">${d.title}</div>
            <div class="incident-detail">${d.detail}</div>
            <div class="incident-meta">${inc.type} &middot; aberto ${formatRelativeTime(inc.tsOpen)}</div>
          </div>
        </div>
      `;
    })
    .join('');
}
