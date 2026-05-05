// src/simulator/monitor.js
// Monitor do simulador. Roda em paralelo com o loop de tick e detecta:
//
//   1) STUCK_DIA_TODO: vaga que nao mudou de estado por > 8 horas simuladas
//   2) FLAPPING:       vaga que mudou de estado > 6 vezes na ultima hora simulada
//   3) NUNCA_USADA:    vaga FREE que nao recebeu nenhuma chegada por > 12 horas sim
//   4) ALERTA_80:      setor com mais de 80% das vagas ocupadas
//
// Importante: detectar eh diferente de injetar. O "modo de teste" injeta
// falhas; o monitor detecta quando algo parece errado (mesmo sem injecao).
// Em producao real, o monitor olharia o stream de eventos ja gravado;
// aqui ele olha direto a memoria do simulador, simplificando.

const config = require('../config');

// Limiares de deteccao (em MINUTOS SIMULADOS)
const TH = {
  stuckMinutes: 8 * 60,         // 8h sem mudar -> stuck
  flappingChangesPerHour: 6,    // > 6 trocas em 60 min sim -> flapping
  unusedMinutes: 12 * 60,       // 12h FREE sem nenhuma chegada -> nunca_usada
  janelaFlappingMin: 60,        // janela onde contamos as trocas
};

class Monitor {
  constructor({ sensorsByKey, sensorsBySector, gateways }) {
    this.sensorsByKey = sensorsByKey;
    this.sensorsBySector = sensorsBySector;
    this.gateways = gateways;

    // Historico por vaga: {
    //   lastChangeAt: minuto-sim da ultima mudanca,
    //   changesWindow: [lista de minutos-sim das ultimas mudancas]
    // }
    this.historico = {};
    Object.keys(sensorsByKey).forEach((spotId) => {
      this.historico[spotId] = {
        lastChangeAt: 0,
        changesWindow: [],
      };
    });

    // Estado do alerta 80% por setor (pra nao spammar varias vezes)
    this.alertaSetor = {}; // sectorId -> bool (true = ja alertado, ainda acima)
    config.sectors.forEach((s) => (this.alertaSetor[s] = false));

    // Anomalias ja reportadas (pra nao spammar)
    this.anomaliasReportadas = new Set(); // chave: "spotId:tipo"
  }

  /**
   * Registra que uma vaga mudou de estado nesse minuto simulado.
   * Chamado pelo loop principal sempre que ha changed=true.
   */
  registrarMudanca(spotId, simMinute) {
    const h = this.historico[spotId];
    h.lastChangeAt = simMinute;
    h.changesWindow.push(simMinute);
    // Mantem a janela de flapping (so os ultimos N min)
    h.changesWindow = h.changesWindow.filter(
      (m) => simMinute - m <= TH.janelaFlappingMin
    );
  }

  /**
   * Roda uma vez por tick. Faz 4 verificacoes em todas as vagas/setores.
   * simMinute = total de minutos simulados desde o inicio.
   */
  verificar(simMinute) {
    this._verificarVagas(simMinute);
    this._verificarSetores();
  }

  // ----------------- vagas -----------------
  _verificarVagas(simMinute) {
    for (const spotId of Object.keys(this.sensorsByKey)) {
      const sensor = this.sensorsByKey[spotId];
      const h = this.historico[spotId];
      const tempoSemMudar = simMinute - h.lastChangeAt;

      // (1) Stuck dia todo
      if (tempoSemMudar > TH.stuckMinutes) {
        this._reportar(spotId, 'STUCK_DIA_TODO', sensor.sectorId, {
          state: sensor.state,
          minutosSemMudar: tempoSemMudar,
        });
      }

      // (2) Flapping (mais de N trocas na janela)
      if (h.changesWindow.length > TH.flappingChangesPerHour) {
        this._reportar(spotId, 'FLAPPING', sensor.sectorId, {
          trocasNaUltimaHora: h.changesWindow.length,
        });
      }

      // (3) Vaga nunca usada (FREE faz tempao)
      if (
        sensor.state === 'FREE' &&
        tempoSemMudar > TH.unusedMinutes
      ) {
        this._reportar(spotId, 'NUNCA_USADA', sensor.sectorId, {
          minutosSemUso: tempoSemMudar,
        });
      }
    }
  }

  // ----------------- setores -----------------
  _verificarSetores() {
    for (const sectorId of config.sectors) {
      const sensors = this.sensorsBySector[sectorId];
      const ocupadas = sensors.filter((s) => s.state === 'OCCUPIED').length;
      const ocupacao = ocupadas / sensors.length;

      if (ocupacao >= config.alertThreshold) {
        // Acabou de cruzar pra cima? Dispara alerta.
        if (!this.alertaSetor[sectorId]) {
          this.alertaSetor[sectorId] = true;
          this._alertarSetorCheio(sectorId, ocupacao, ocupadas, sensors.length);
        }
      } else {
        // Voltou ao normal? Marca como nao alertado pra alertar de novo se subir.
        if (this.alertaSetor[sectorId]) {
          console.log(
            `\x1b[32m[monitor] setor ${sectorId} voltou ao normal (${(ocupacao * 100).toFixed(0)}% ocupado)\x1b[0m`
          );
        }
        this.alertaSetor[sectorId] = false;
      }
    }
  }

  _alertarSetorCheio(sectorId, ocupacao, ocupadas, total) {
    const pct = (ocupacao * 100).toFixed(0);
    // 1) Console (vermelho)
    console.log(
      `\x1b[31m[ALERTA] setor ${sectorId} esta ${pct}% ocupado (${ocupadas}/${total})\x1b[0m`
    );
    // 2) MQTT
    this.gateways[sectorId].publishAlert({
      type: 'SECTOR_HIGH_OCCUPANCY',
      occupancyPct: parseFloat(pct),
      occupied: ocupadas,
      total,
      threshold: config.alertThreshold,
    });
  }

  _reportar(spotId, tipo, sectorId, detalhes) {
    const chave = `${spotId}:${tipo}`;
    if (this.anomaliasReportadas.has(chave)) return; // ja reportado, nao spam
    this.anomaliasReportadas.add(chave);

    console.log(
      `\x1b[33m[monitor] ANOMALIA ${tipo} em ${spotId} ` +
        `${JSON.stringify(detalhes)}\x1b[0m`
    );
    // Tambem publica como alerta no setor
    this.gateways[sectorId].publishAlert({
      type: tipo,
      spotId,
      ...detalhes,
    });
  }

  /**
   * Limpa marcacoes de anomalia. Util quando uma vaga volta ao normal,
   * permitindo que ela seja reportada de novo no futuro se quebrar de novo.
   */
  limparReporte(spotId) {
    for (const tipo of ['STUCK_DIA_TODO', 'FLAPPING', 'NUNCA_USADA']) {
      this.anomaliasReportadas.delete(`${spotId}:${tipo}`);
    }
  }
}

module.exports = { Monitor };
