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
  stuckMs: 8 * 60 * 60 * 1000,
  flappingWindow: 60 * 1000,
  flappingMaxChanges: 6,
  minStateDurationMs: 10 * 1000,
  startupGraceMs: 30 * 1000,
};
class IncidentDetector {
  constructor() {
    this.historico = new Map();
    this.startedAt = Date.now();
  }

  async processar(evt) {
    const { spotId, sectorId, state, ts } = evt;
    const agora = new Date(ts);

    if (!this.historico.has(spotId)) {
      this.historico.set(spotId, {
        lastState: state,
        lastChangeTs: agora,
        changesInWindow: [],
        totalChanges: 0,
      });
      return;
    }

    const h = this.historico.get(spotId);
    const mudou = state !== h.lastState;

    if (mudou) {
      const estadoAnterior = h.lastState;
      const ultimaMudancaAnterior = h.lastChangeTs;
      const tempoNoEstadoAnteriorMs = agora - ultimaMudancaAnterior;

      h.totalChanges += 1;

      const emInicializacao =
        Date.now() - this.startedAt <= TH.startupGraceMs;

      const primeiraTroca = h.totalChanges === 1;

      h.lastState = state;
      h.lastChangeTs = agora;

      h.changesInWindow.push(agora);
      h.changesInWindow = h.changesInWindow.filter(
        (t) => agora - t <= TH.flappingWindow
      );

      await this._fecharSeExistir(spotId, 'STUCK_OCCUPIED');
      await this._fecharSeExistir(spotId, 'STUCK_FREE');

      const trocaRapidaDemais =
        !emInicializacao &&
        !primeiraTroca &&
        estadoAnterior === 'OCCUPIED' &&
        state === 'FREE' &&
        tempoNoEstadoAnteriorMs <= TH.minStateDurationMs;

      const muitasTrocasNaJanela =
        !emInicializacao &&
        h.changesInWindow.length > TH.flappingMaxChanges;

      if (trocaRapidaDemais || muitasTrocasNaJanela) {
        await incidentDb.openIncident({
          type: 'FLAPPING',
          sectorId,
          spotId,
          evidenceJson: {
            motivo: trocaRapidaDemais
              ? 'TROCA_RAPIDA_DEMAIS'
              : 'MUITAS_TROCAS_NA_JANELA',
            estadoAnterior,
            estadoAtual: state,
            tempoNoEstadoAnteriorMs,
            tempoNoEstadoAnteriorSegundos: parseFloat(
              (tempoNoEstadoAnteriorMs / 1000).toFixed(1)
            ),
            trocasNaJanela: h.changesInWindow.length,
            janelaMs: TH.flappingWindow,
            startupGraceMs: TH.startupGraceMs,
            ultimaTrocaTs: agora.toISOString(),
          },
        });
      } else {
        await this._fecharSeExistir(spotId, 'FLAPPING');
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
