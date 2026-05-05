// src/backend/pool.js
// Pool unico do node-postgres compartilhado por todo o backend.
// Inclui waitForReady() pra retry de conexao no boot, util quando o
// container do Postgres ainda esta subindo.

const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  // Conexoes idle podem cair (ex.: Postgres reiniciou). O pool refaz sozinho;
  // so logamos pra o operador notar.
  console.error('[pg] erro em conexao idle:', err.message);
});

/**
 * Tenta um SELECT 1 ate o Postgres responder ou esgotar tentativas.
 * Usado no boot do backend pra esperar o container subir.
 */
async function waitForReady({ maxAttempts = 30, delayMs = 1000 } = {}) {
  let lastErr;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      lastErr = err;
      console.log(`[pg] aguardando banco (tentativa ${i}/${maxAttempts})...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error(
    `[pg] nao consegui conectar em ${config.databaseUrl} apos ${maxAttempts} tentativas: ${lastErr?.message}`
  );
}

async function close() {
  await pool.end();
}

module.exports = { pool, waitForReady, close };
