// src/simulator/layout.js
// Layout do estacionamento como MATRIZ 3x30 (sugestao do professor).
// Linhas: setores A, B, C
// Colunas: vagas 01..30
//
// Esse formato facilita iterar por setor (linha inteira) e mantem
// a estrutura visual de um estacionamento real.

const { sectors, spotsPerSector } = require('../config');

/**
 * Gera a matriz [setor][vaga] com os IDs no formato "A-01", "A-02", ...
 * Retorna uma estrutura tipo:
 *   [
 *     ['A-01', 'A-02', ..., 'A-30'],  // linha 0 = setor A
 *     ['B-01', 'B-02', ..., 'B-30'],  // linha 1 = setor B
 *     ['C-01', 'C-02', ..., 'C-30'],  // linha 2 = setor C
 *   ]
 */
function buildMatrix() {
  return sectors.map((sectorId) => {
    const linha = [];
    for (let i = 1; i <= spotsPerSector; i++) {
      const numero = String(i).padStart(2, '0'); // 01, 02, ..., 30
      linha.push(`${sectorId}-${numero}`);
    }
    return linha;
  });
}

/**
 * Retorna lista plana de todas as vagas: [{sectorId, spotId, row, col}].
 * Util pra iterar por todas sem se preocupar com a estrutura 2D.
 */
function listAllSpots() {
  const matriz = buildMatrix();
  const lista = [];
  matriz.forEach((linha, row) => {
    const sectorId = sectors[row];
    linha.forEach((spotId, col) => {
      lista.push({ sectorId, spotId, row, col });
    });
  });
  return lista;
}

module.exports = { buildMatrix, listAllSpots };
