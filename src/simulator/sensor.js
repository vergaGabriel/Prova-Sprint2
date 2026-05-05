// src/simulator/sensor.js
// Modelo de UM sensor (1 vaga). Cada tick = 1 minuto simulado.
//
// Estados possiveis: FREE | OCCUPIED
// Falhas injetaveis: stuck_occupied | stuck_free | flapping  (ou null = saudavel)

const FREE = 'FREE';
const OCCUPIED = 'OCCUPIED';

// -------------------------------------------------------------------
// Padroes realistas: probabilidade de uma vaga LIVRE ser ocupada
// no proximo minuto, baseada na hora do dia.
//   - 7h-9h:   pico da manha (chegadas no campus)
//   - 11h-14h: almoco (movimento medio)
//   - 17h-19h: pico fim de tarde (saida)
//   - madrugada: quase ninguem
// -------------------------------------------------------------------
function probabilidadeChegada(hora) {
  if (hora >= 7  && hora < 9)  return 0.06;  // pico manha
  if (hora >= 9  && hora < 11) return 0.025;
  if (hora >= 11 && hora < 14) return 0.04;  // almoco
  if (hora >= 14 && hora < 17) return 0.025;
  if (hora >= 17 && hora < 19) return 0.07;  // pico fim de tarde
  if (hora >= 19 && hora < 22) return 0.015;
  return 0.003;                              // madrugada
}

// -------------------------------------------------------------------
// Tempo de permanencia (em minutos simulados): entre 30 min e 6 horas.
// Distribuicao com vies pra estadias curtas (mais comum).
// -------------------------------------------------------------------
function escolherTempoPermanencia() {
  const r = Math.random();
  if (r < 0.55) return 30  + Math.floor(Math.random() * 60);   // 30-90 min  (55%)
  if (r < 0.85) return 90  + Math.floor(Math.random() * 90);   // 90-180 min (30%)
  return                180 + Math.floor(Math.random() * 180); // 180-360 min (15%)
}

class Sensor {
  constructor({ sectorId, spotId }) {
    this.sectorId = sectorId;
    this.spotId = spotId;

    // Estado inicial: 30% das vagas comecam ocupadas (mais realista que tudo livre)
    this.state = Math.random() < 0.3 ? OCCUPIED : FREE;
    this.dwell = this.state === OCCUPIED ? escolherTempoPermanencia() : 0;

    // Falha injetada (null = saudavel)
    this.fault = null;
    this.flapEvery = 1;     // frequencia do flapping (em minutos sim)
    this.flapCounter = 0;
  }

  // ------------ controle de falhas (chamado pelo HTTP de teste) ------------
  setFault(tipo) {
    this.fault = tipo;
    this.flapCounter = 0;
    if (tipo === 'flapping') {
      // Flapping: troca de estado a cada 1-2 min simulados (rapido demais)
      this.flapEvery = 1 + Math.floor(Math.random() * 2);
    }
  }

  clearFault() {
    this.fault = null;
  }

  // ------------ um passo no tempo simulado ------------
  // Recebe a hora do dia (0-23) pra modular probabilidade.
  // Retorna {changed: bool, newState: string} se houve mudanca.
  tick(simHour) {
    const estadoAnterior = this.state;

    if (this.fault === 'stuck_occupied') {
      // Travado ocupado: ignora qualquer transicao
      this.state = OCCUPIED;
    } else if (this.fault === 'stuck_free') {
      // Travado livre: ignora qualquer transicao
      this.state = FREE;
    } else if (this.fault === 'flapping') {
      // Flapping: alterna rapido demais (sem logica realista)
      this.flapCounter++;
      if (this.flapCounter >= this.flapEvery) {
        this.state = this.state === FREE ? OCCUPIED : FREE;
        this.flapCounter = 0;
      }
    } else {
      // ------ Comportamento saudavel ------
      if (this.state === FREE) {
        // Vaga livre? Roda dado de chegada (modulado pela hora)
        if (Math.random() < probabilidadeChegada(simHour)) {
          this.state = OCCUPIED;
          this.dwell = escolherTempoPermanencia();
        }
      } else {
        // Vaga ocupada? Decrementa o tempo de permanencia
        this.dwell--;
        if (this.dwell <= 0) {
          this.state = FREE;
        }
      }
    }

    return {
      changed: estadoAnterior !== this.state,
      newState: this.state,
    };
  }
}

module.exports = { Sensor, FREE, OCCUPIED };
