// src/backend/incidents.js
// Motor de deteccao de inconsistencias - ETAPA 6.
//
// Detecta e registra incidentes para:
//   - STUCK_OCCUPIED : vaga sempre OCCUPIED por tempo suspeito
//   - STUCK_FREE     : vaga sempre FREE por tempo suspeito
//   - FLAPPING       : vaga trocando de estado rapido demais
//
// Dois caminhos de deteccao:
//
//   1) processar(evt) — chamado pelo backend a CADA evento ingerido.
//      Detecta FLAPPING (janela rolante de trocas) e fecha STUCK quando
//      a vaga volta a mudar de estado.
//
//   2) scanStuck() — job periodico que varre a tabela `spots` procurando
//      vagas com `last_ts < NOW() - stuckThresholdMs`. Necessario porque
//      um sensor travado nao publica novos eventos, entao o caminho (1)
//      nao seria suficiente.
//
// Limiares (em TEMPO REAL, ms reais — o `ts` do payload e new Date() no
// gateway, nao tempo simulado). Configuraveis via .env, ver src/config.js.

const incidentDb = require('./incidentDb');
const config = require('../config');
const { pool } = require('./pool');

const TH = {
  stuckMs:           config.stuckThresholdMs,
  scanIntervalMs:    config.stuckScanIntervalMs,
  flappingWindowMs:  config.flappingWindowMs,
  flappingMaxChanges: config.flappingMaxChanges,
  startupGraceMs:    config.incidentStartupGraceMs,
};

class IncidentDetector {
  constructor() {
    // Por spotId: { lastState, lastChangeTs (Date), changesInWindow: Date[] }
    this.historico = new Map();
    this.startedAt = Date.now();
    this.scanTimer = null;
  }

  // -----------------------------------------------------------------
  // Caminho 1: orientado a evento — FLAPPING + recovery de STUCK
  // -----------------------------------------------------------------
  async processar(evt) {
    const { spotId, sectorId, state, ts } = evt;
    const agora = new Date(ts);

    // Bootstrap: primeiro evento dessa vaga, so registra estado.
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

    // Sem mudanca: o caminho de FLAPPING nao se aplica. STUCK e tratado
    // pelo scanner periodico (scanStuck), nao aqui.
    if (!mudou) return;

    const estadoAnterior = h.lastState;
    const tempoNoEstadoAnteriorMs = agora - h.lastChangeTs;

    h.totalChanges += 1;
    h.lastState = state;
    h.lastChangeTs = agora;

    // Janela rolante de trocas (descarta as fora da janela)
    h.changesInWindow.push(agora);
    h.changesInWindow = h.changesInWindow.filter(
      (t) => agora - t <= TH.flappingWindowMs
    );

    const emInicializacao =
      Date.now() - this.startedAt <= TH.startupGraceMs;

    // Toda transicao real recupera STUCK (sensor voltou a funcionar)
    await this._fecharSeExistir(spotId, 'STUCK_OCCUPIED');
    await this._fecharSeExistir(spotId, 'STUCK_FREE');

    // FLAPPING simetrico: muitas trocas na janela, em qualquer direcao.
    const muitasTrocasNaJanela =
      !emInicializacao &&
      h.changesInWindow.length > TH.flappingMaxChanges;

    if (muitasTrocasNaJanela) {
      await incidentDb.openIncident({
        type: 'FLAPPING',
        sectorId,
        spotId,
        evidenceJson: {
          motivo: 'MUITAS_TROCAS_NA_JANELA',
          estadoAnterior,
          estadoAtual: state,
          tempoNoEstadoAnteriorMs,
          tempoNoEstadoAnteriorSegundos: parseFloat(
            (tempoNoEstadoAnteriorMs / 1000).toFixed(1)
          ),
          trocasNaJanela: h.changesInWindow.length,
          janelaMs: TH.flappingWindowMs,
          maxTrocas: TH.flappingMaxChanges,
          ultimaTrocaTs: agora.toISOString(),
        },
      });
    } else {
      // Estabilizou: fecha FLAPPING aberto se houver
      await this._fecharSeExistir(spotId, 'FLAPPING');
    }
  }

  // -----------------------------------------------------------------
  // Caminho 2: scanner periodico — STUCK_OCCUPIED / STUCK_FREE
  // -----------------------------------------------------------------
  async scanStuck() {
    // Graca apos o boot pra evitar abrir incidentes em massa enquanto
    // o sistema ainda nao recebeu o snapshot inicial das 90 vagas.
    if (Date.now() - this.startedAt < TH.startupGraceMs) return;

    try {
      const r = await pool.query(
        `SELECT spot_id, sector_id, state, last_ts,
                EXTRACT(EPOCH FROM (NOW() - last_ts)) AS seconds_in_state
         FROM spots
         WHERE last_ts IS NOT NULL
           AND last_ts < NOW() - ($1::bigint * INTERVAL '1 millisecond')`,
        [TH.stuckMs]
      );

      for (const row of r.rows) {
        const type =
          row.state === 'OCCUPIED' ? 'STUCK_OCCUPIED' : 'STUCK_FREE';
        const segundos = Math.floor(Number(row.seconds_in_state));
        await incidentDb.openIncident({
          type,
          sectorId: row.sector_id,
          spotId: row.spot_id,
          evidenceJson: {
            tempoSemMudarSegundos: segundos,
            tempoSemMudarMinutos: parseFloat((segundos / 60).toFixed(1)),
            tempoSemMudarHoras:   parseFloat((segundos / 3600).toFixed(2)),
            ultimaMudancaTs: row.last_ts.toISOString(),
            estadoAtual: row.state,
            thresholdMs: TH.stuckMs,
          },
        });
      }
    } catch (err) {
      console.warn('[incidents] erro no scanStuck:', err.message);
    }
  }

  startStuckScanner(intervalMs = TH.scanIntervalMs) {
    if (this.scanTimer) return;
    console.log(
      `[incidents] scanner STUCK iniciado (a cada ${intervalMs}ms; ` +
        `threshold=${TH.stuckMs}ms; graca=${TH.startupGraceMs}ms)`
    );
    this.scanTimer = setInterval(() => this.scanStuck(), intervalMs);
  }

  stopStuckScanner() {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
  }

  // -----------------------------------------------------------------
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
