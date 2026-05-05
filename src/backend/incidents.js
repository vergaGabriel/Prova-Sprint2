// src/backend/incidents.js
// Motor de deteccao de inconsistencias - ETAPA 6.
//
// Detecta e registra incidentes para:
//   - STUCK_OCCUPIED : vaga sempre OCCUPIED por tempo suspeito
//   - STUCK_FREE     : vaga sempre FREE por tempo suspeito
//   - FLAPPING       : vaga trocando de estado rapido demais
//
// O backend chama incidentDetector.processar(evt) a cada evento ingerido.
// Mantem um historico leve em memoria por vaga (estado anterior, ts da
// ultima troca, janela rolante de trocas) e aplica as regras abaixo.
// Quando detecta anomalia, persiste em incidents via incidentDb.
//
// Limiares (em tempo SIMULADO, vindo do campo `ts` do payload):
//   STUCK:    >= 8h sem mudar de estado
//   FLAPPING: > 6 trocas em 60 min

const incidentDb = require('./incidentDb');

const TH = {
  stuckMs:             8 * 60 * 60 * 1000, // 8h sim
  flappingWindow:     60 * 60 * 1000,       // 1h sim
  flappingMaxChanges: 6,                    // > 6 trocas na janela
};

class IncidentDetector {
  constructor() {
    // Map: spotId -> { lastState, lastChangeTs, changesInWindow[] }
    this.historico = new Map();
  }

  /**
   * Processa um evento ja validado/inserido. Async porque chama o DB.
   */
  async processar(evt) {
    const { spotId, sectorId, state, ts } = evt;
    const agora = new Date(ts);

    if (!this.historico.has(spotId)) {
      this.historico.set(spotId, {
        lastState:       state,
        lastChangeTs:    agora,
        changesInWindow: [],
      });
      return;
    }

    const h = this.historico.get(spotId);
    const mudou = state !== h.lastState;

    if (mudou) {
      h.lastState    = state;
      h.lastChangeTs = agora;
      h.changesInWindow.push(agora);
      h.changesInWindow = h.changesInWindow.filter(
        (t) => agora - t <= TH.flappingWindow
      );

      // Vaga voltou a se mexer -> stuck pode ser fechado
      await this._fecharSeExistir(spotId, 'STUCK_OCCUPIED');
      await this._fecharSeExistir(spotId, 'STUCK_FREE');

      if (h.changesInWindow.length > TH.flappingMaxChanges) {
        await incidentDb.openIncident({
          type:        'FLAPPING',
          sectorId,
          spotId,
          evidenceJson: {
            trocasNaJanela: h.changesInWindow.length,
            janelaMs:       TH.flappingWindow,
            ultimaTrocaTs:  agora.toISOString(),
          },
        });
      } else {
        await this._fecharSeExistir(spotId, 'FLAPPING');
      }
    } else {
      const tempoSemMudarMs = agora - h.lastChangeTs;
      if (tempoSemMudarMs >= TH.stuckMs) {
        const tipo = state === 'OCCUPIED' ? 'STUCK_OCCUPIED' : 'STUCK_FREE';
        await incidentDb.openIncident({
          type:        tipo,
          sectorId,
          spotId,
          evidenceJson: {
            state,
            tempoSemMudarMs,
            tempoSemMudarHoras: parseFloat((tempoSemMudarMs / 3_600_000).toFixed(1)),
            ultimaMudancaTs:    h.lastChangeTs.toISOString(),
            eventoTs:           agora.toISOString(),
          },
        });
      }
    }
  }

  async _fecharSeExistir(spotId, type) {
    const inc = await incidentDb.getOpenIncident(spotId, type);
    if (inc) await incidentDb.closeIncident(inc.id);
  }

  async getStats() {
    return incidentDb.getStats();
  }
}

const incidentDetector = new IncidentDetector();
module.exports = { incidentDetector, incidentDb };
