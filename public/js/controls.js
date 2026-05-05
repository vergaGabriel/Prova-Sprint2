// public/js/controls.js
// Painel de injecao de falhas. Constroi UI no rootEl e fala com :4000 via api.js.
//
// Modos:
//   - "vaga":   injeta falha em uma vaga especifica (datalist com as 90 ids)
//   - "setor":  injeta falha em todas as vagas de um setor
//
// Acoes:
//   - Injetar:        POST /faults
//   - Limpar todas:   DELETE /faults  (com confirm())

import { icons } from './icons.js';
import { injectFault, clearFaults } from './api.js';

const SECTORS = ['A', 'B', 'C'];
const FAULTS  = [
  { value: 'stuck_occupied', label: 'stuck_occupied (sempre ocupada)' },
  { value: 'stuck_free',     label: 'stuck_free (sempre livre)'        },
  { value: 'flapping',       label: 'flapping (troca rapido)'          },
];

function allSpotIds() {
  const ids = [];
  for (const s of SECTORS) {
    for (let i = 1; i <= 30; i++) {
      ids.push(`${s}-${String(i).padStart(2, '0')}`);
    }
  }
  return ids;
}

export function setupControls(root, { showToast }) {
  root.innerHTML = `
    <div class="controls">
      <div class="control-group">
        <span class="control-label">Alvo</span>
        <div class="control-radio-group" id="target-mode">
          <button type="button" class="control-radio" data-mode="vaga"  aria-pressed="true">Vaga</button>
          <button type="button" class="control-radio" data-mode="setor" aria-pressed="false">Setor inteiro</button>
        </div>
      </div>

      <div class="control-group" id="vaga-group">
        <label class="control-label" for="spot-input">Vaga</label>
        <input
          class="control-input"
          id="spot-input"
          list="spot-list"
          placeholder="A-07"
          autocomplete="off"
          spellcheck="false"
        />
        <datalist id="spot-list">
          ${allSpotIds().map((id) => `<option value="${id}"></option>`).join('')}
        </datalist>
      </div>

      <div class="control-group hidden" id="setor-group" style="display:none">
        <label class="control-label" for="sector-select">Setor</label>
        <select class="control-select" id="sector-select">
          ${SECTORS.map((s) => `<option value="${s}">${s}</option>`).join('')}
        </select>
      </div>

      <div class="control-group">
        <label class="control-label" for="fault-select">Falha</label>
        <select class="control-select" id="fault-select">
          ${FAULTS.map((f) => `<option value="${f.value}">${f.label}</option>`).join('')}
        </select>
      </div>

      <div class="control-group">
        <span class="control-label">&nbsp;</span>
        <button type="button" class="btn btn--primary" id="inject-btn">
          ${icons.zap}<span>Injetar falha</span>
        </button>
      </div>

      <div class="control-group">
        <span class="control-label">&nbsp;</span>
        <button type="button" class="btn btn--danger" id="clear-btn">Limpar todas</button>
      </div>
    </div>
  `;

  const modeBtns    = root.querySelectorAll('[data-mode]');
  const vagaGroup   = root.querySelector('#vaga-group');
  const setorGroup  = root.querySelector('#setor-group');
  const spotInput   = root.querySelector('#spot-input');
  const sectorSel   = root.querySelector('#sector-select');
  const faultSel    = root.querySelector('#fault-select');
  const injectBtn   = root.querySelector('#inject-btn');
  const clearBtn    = root.querySelector('#clear-btn');

  let mode = 'vaga';

  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.mode;
      modeBtns.forEach((b) =>
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false')
      );
      vagaGroup.style.display  = mode === 'vaga'  ? '' : 'none';
      setorGroup.style.display = mode === 'setor' ? '' : 'none';
    });
  });

  injectBtn.addEventListener('click', async () => {
    const fault = faultSel.value;
    try {
      let result;
      if (mode === 'vaga') {
        const spotId = spotInput.value.trim().toUpperCase();
        if (!/^[ABC]-\d{2}$/.test(spotId)) {
          return showToast(`Vaga invalida: "${spotId}". Use formato A-07.`, 'error');
        }
        result = await injectFault({ spotId, fault });
        showToast(`Falha "${fault}" injetada em ${spotId}`, 'success');
      } else {
        const sectorId = sectorSel.value;
        result = await injectFault({ sectorId, fault });
        showToast(
          `Falha "${fault}" injetada em ${result.afetadas?.length || 0} vagas do setor ${sectorId}`,
          'success'
        );
      }
    } catch (err) {
      showToast(`Falha na injecao: ${err.message}`, 'error');
    }
  });

  clearBtn.addEventListener('click', async () => {
    if (!window.confirm('Limpar TODAS as falhas injetadas no simulador?')) return;
    try {
      const result = await clearFaults();
      showToast(`${result.limpas?.length || 0} vaga(s) restauradas`, 'success');
    } catch (err) {
      showToast(`Falha ao limpar: ${err.message}`, 'error');
    }
  });
}
