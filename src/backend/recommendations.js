// src/backend/recommendations.js
// Motor de recomendacoes - ETAPA 5 (Regra R-OP1).
//
// Quando occupancyRate(sector) >= 0.90:
//   - calcula recomendacao "vai pro setor X"
//   - persiste em recommendations_log
//   - publica em MQTT (opcional)
//
// Logica minima exigida pela prova: vagas livres atuais no setor candidato.
// Estrategia: dentre os outros setores nao lotados, escolhe o com mais vagas
// livres; empate -> ordem alfabetica.
//
// Disparo automatico:
//   processSpotChange(sectorId) e chamado pelo backend apos cada update.
//   O motor detecta a borda de subida (cruzar 90%) e dispara UMA vez por
//   subida (so dispara de novo se cair <90% e voltar a subir).

const config = require('../config');
const db = require('./db');

class RecommendationEngine {
  constructor() {
    // Por setor: estava acima do limiar na ultima checagem? (detecta borda)
    this.acimaDoLimiar = {};
    for (const s of config.sectors) this.acimaDoLimiar[s] = false;

    this.mqttPublish = null;
  }

  setMqttPublisher(fn) {
    this.mqttPublish = fn;
  }

  /**
   * Calcula a recomendacao on-demand para `fromSector`. Retorna o objeto
   * com `recommendedSector` (ou null se nao houver candidato disponivel).
   */
  async compute(fromSector) {
    if (!config.sectors.includes(fromSector)) return null;

    const fromStats = await db.getSectorOccupancy(fromSector);

    // Avalia candidatos em paralelo
    const outros = config.sectors.filter((s) => s !== fromSector);
    const stats = await Promise.all(outros.map((s) => db.getSectorOccupancy(s)));

    const candidatos = outros
      .map((s, i) => ({ sectorId: s, ...stats[i] }))
      .filter((c) => c.freeCount > 0 && c.occupancyRate < config.recommendationThreshold)
      .sort((a, b) => {
        if (b.freeCount !== a.freeCount) return b.freeCount - a.freeCount;
        return a.sectorId.localeCompare(b.sectorId);
      });

    if (candidatos.length === 0) {
      return {
        fromSector,
        recommendedSector: null,
        reason:
          `Sector ${fromSector} at ${(fromStats.occupancyRate * 100).toFixed(0)}% occupancy; ` +
          `no alternative sector available below ${(config.recommendationThreshold * 100).toFixed(0)}% threshold`,
        ts: new Date().toISOString(),
        fromOccupancyRate: fromStats.occupancyRate,
      };
    }

    const escolhido = candidatos[0];
    return {
      fromSector,
      recommendedSector: escolhido.sectorId,
      reason:
        `Sector ${fromSector} at ${(fromStats.occupancyRate * 100).toFixed(0)}% occupancy; ` +
        `Sector ${escolhido.sectorId} has ${escolhido.freeCount} free spots`,
      ts: new Date().toISOString(),
      fromOccupancyRate: fromStats.occupancyRate,
      candidates: candidatos.map((c) => ({
        sectorId: c.sectorId,
        freeCount: c.freeCount,
        occupancyRate: c.occupancyRate,
      })),
    };
  }

  /**
   * Chamado pelo backend apos cada mudanca de estado. Detecta borda de
   * subida (cruzar 90%) e dispara recomendacao automatica.
   */
  async processSpotChange(sectorId) {
    const stats = await db.getSectorOccupancy(sectorId);
    const acima = stats.occupancyRate >= config.recommendationThreshold;

    // Borda de descida -> reseta marcador
    if (this.acimaDoLimiar[sectorId] && !acima) {
      this.acimaDoLimiar[sectorId] = false;
      console.log(
        `[reco] setor ${sectorId} voltou abaixo do limiar (${(stats.occupancyRate * 100).toFixed(0)}%)`
      );
      return;
    }

    if (!acima || this.acimaDoLimiar[sectorId]) return;

    // ===== Borda de subida =====
    this.acimaDoLimiar[sectorId] = true;

    const reco = await this.compute(sectorId);
    if (!reco) return;

    await db.logRecommendation({
      ts: reco.ts,
      fromSector: reco.fromSector,
      recommendedSector: reco.recommendedSector,
      reason: reco.reason,
      dataJson: {
        fromOccupancyRate: reco.fromOccupancyRate,
        candidates: reco.candidates || [],
        trigger: 'auto',
      },
    });

    console.log(
      `\x1b[35m[reco] AUTO ${reco.fromSector} -> ${reco.recommendedSector || '(nenhum)'} | ${reco.reason}\x1b[0m`
    );

    if (this.mqttPublish) {
      try {
        this.mqttPublish(config.topics.recommendations, JSON.stringify(reco));
      } catch (err) {
        console.warn('[reco] falha ao publicar em MQTT:', err.message);
      }
    }
  }
}

const recommendationEngine = new RecommendationEngine();
module.exports = { recommendationEngine };
