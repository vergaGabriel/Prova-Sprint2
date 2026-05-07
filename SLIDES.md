---
marp: true
theme: default
paginate: true
size: 16:9
header: ''
footer: 'Sprint 2 - IoT'
style: |
  section {
    background: #0a1929;
    color: #e6edf3;
    font-family: -apple-system, "Segoe UI", system-ui, sans-serif;
    padding: 50px 60px;
    font-size: 22px;
  }
  section.title {
    text-align: left;
    background: radial-gradient(circle at 80% 20%, #102a43 0%, #0a1929 60%);
  }
  section.title h1 {
    font-size: 56px;
    border: none;
    line-height: 1.15;
  }
  section.title h1 .accent { color: #4da6ff; }
  section.divider {
    text-align: center;
    justify-content: center;
    align-items: center;
    display: flex;
    flex-direction: column;
    background: radial-gradient(circle at center, #102a43 0%, #0a1929 70%);
  }
  section.divider h1 {
    font-size: 64px;
    color: #4da6ff;
    border: none;
  }
  section.divider h2 {
    font-size: 28px;
    color: #aab7c4;
    font-weight: 400;
  }
  h1 {
    color: #ffffff;
    font-size: 36px;
    border-bottom: 1px solid #4da6ff;
    padding-bottom: 8px;
    margin-bottom: 20px;
  }
  h2 { color: #4da6ff; font-size: 24px; }
  h3 { color: #4da6ff; font-size: 20px; }
  p, li { line-height: 1.5; }
  strong { color: #ffffff; }
  code { background: #1e2a3a; color: #79c0ff; padding: 2px 8px; border-radius: 4px; font-size: 18px; }
  pre {
    background: #0d1117 !important;
    border: 1px solid #21333d;
    border-radius: 6px;
    padding: 14px 18px !important;
    font-size: 16px;
    line-height: 1.45;
  }
  pre code { background: transparent; color: #c9d1d9; padding: 0; }
  table { font-size: 19px; margin-top: 12px; }
  th { background: #102a43; color: #4da6ff; }
  td, th { padding: 8px 14px; border: 1px solid #21333d; }

  /* Pilula da etapa */
  .tag {
    position: absolute;
    top: 36px;
    right: 60px;
    background: #4da6ff;
    color: #0a1929;
    padding: 6px 22px;
    border-radius: 18px;
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 0.5px;
  }

  /* Pilula nomeando o arquivo (acima de um bloco de codigo) */
  .file {
    display: inline-block;
    background: #102a43;
    color: #4da6ff;
    padding: 4px 14px;
    border-radius: 14px;
    font-size: 14px;
    font-family: "SF Mono", Menlo, monospace;
    margin-bottom: 6px;
    border: 1px solid #1e3a5f;
  }
  .file.green  { background: #0c2a18; color: #4ade80; border-color: #1f5f33; }
  .file.orange { background: #2a1d0c; color: #f0a020; border-color: #5f3f1f; }
  .file.red    { background: #2a1010; color: #f87171; border-color: #5f1f1f; }
  .file.purple { background: #1d1029; color: #c084fc; border-color: #3f1f5f; }

  /* Cards de stats (4 colunas) */
  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 18px;
    margin-top: 28px;
  }
  .stat {
    border: 2px solid;
    border-radius: 14px;
    padding: 18px;
    text-align: center;
    background: rgba(255,255,255,0.02);
  }
  .stat .num { font-size: 44px; font-weight: 800; line-height: 1; }
  .stat .lbl { font-size: 14px; color: #aab7c4; margin-top: 8px; }
  .stat.cy { border-color: #4da6ff; } .stat.cy .num { color: #4da6ff; }
  .stat.gr { border-color: #4ade80; } .stat.gr .num { color: #4ade80; }
  .stat.or { border-color: #f0a020; } .stat.or .num { color: #f0a020; }
  .stat.pu { border-color: #c084fc; } .stat.pu .num { color: #c084fc; }
  .stat.rd { border-color: #f87171; } .stat.rd .num { color: #f87171; }

  /* Cards componente (com legenda dentro) */
  .components {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-top: 24px;
  }
  .comp {
    border: 2px solid;
    border-radius: 14px;
    padding: 22px 16px;
    text-align: center;
    background: rgba(255,255,255,0.02);
  }
  .comp .title { font-size: 36px; font-weight: 800; }
  .comp .desc  { font-size: 15px; color: #aab7c4; margin-top: 8px; }

  /* Layout de duas colunas (texto + codigo, ou codigo + codigo) */
  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-top: 14px;
  }
  .three {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 18px;
    margin-top: 14px;
  }

  /* Diagrama de fluxo horizontal */
  .flow {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    margin-top: 14px;
    margin-bottom: 14px;
  }
  .flow .node {
    flex: 1;
    border: 2px solid #4da6ff;
    border-radius: 12px;
    padding: 16px 12px;
    text-align: center;
    background: rgba(77,166,255,0.05);
  }
  .flow .node .h { font-size: 22px; font-weight: 800; }
  .flow .node .s { font-size: 13px; color: #aab7c4; }
  .flow .arrow { color: #4da6ff; font-size: 28px; font-weight: bold; }

  /* Numero de passo (checklist) */
  .step {
    display: flex;
    align-items: center;
    gap: 14px;
    border: 1px solid #21333d;
    border-radius: 10px;
    padding: 10px 14px;
    background: rgba(255,255,255,0.02);
  }
  .step .n {
    background: #4da6ff;
    color: #0a1929;
    width: 32px; height: 32px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    flex-shrink: 0;
  }
  .step.or .n { background: #f0a020; }
  .step .t { font-weight: 700; font-size: 18px; }
  .step .d { font-size: 13px; color: #aab7c4; }

  /* Grid 2x4 pra checklist */
  .grid2x4 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 18px;
  }

  /* Setor visual mini */
  .sectors-vis {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-top: 14px;
  }
  .sector-vis {
    border: 2px solid;
    border-radius: 12px;
    padding: 14px;
    background: rgba(255,255,255,0.02);
  }
  .sector-vis.A { border-color: #4ade80; }
  .sector-vis.B { border-color: #f0a020; }
  .sector-vis.C { border-color: #c084fc; }
  .sector-vis .name { font-weight: 800; font-size: 18px; margin-bottom: 8px; }
  .sector-vis .grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 4px;
  }
  .sector-vis .cell {
    height: 14px;
    border-radius: 2px;
    border: 1px solid currentColor;
    opacity: 0.4;
  }
  .sector-vis .cell.on { opacity: 1; }
  .sector-vis .id { font-size: 12px; color: #aab7c4; margin-top: 8px; text-align: center; }

  /* Highlight box pra exemplo de mensagem etc */
  .quote {
    border: 1px solid #4da6ff;
    border-radius: 10px;
    padding: 16px 22px;
    background: rgba(77,166,255,0.05);
    margin-top: 20px;
  }
  .quote .hint { font-weight: 700; color: #ffffff; }
  .quote .msg  { color: #4da6ff; font-size: 22px; font-weight: 800; margin: 6px 0; }
  .quote .meta { color: #aab7c4; font-size: 14px; }
---

<!-- _class: title -->

# **MVP: Estacionamento**
# <span class="accent">Inteligente para Campus</span>

MQTT em tempo real + API REST + Banco de Dados + simulacao de sensores

<div class="stats">
<div class="stat cy"><div class="num">3</div><div class="lbl">setores: A, B, C</div></div>
<div class="stat gr"><div class="num">90</div><div class="lbl">vagas simuladas</div></div>
<div class="stat or"><div class="num">30</div><div class="lbl">vagas por setor</div></div>
<div class="stat pu"><div class="num">IoT</div><div class="lbl">MVP sem IA inicial</div></div>
</div>

---

<span class="tag">ESCOPO</span>

# Visao geral do MVP

O MVP acompanha vagas, falhas e recomendacoes em tempo real.

<div class="components">
<div class="comp" style="border-color:#4da6ff"><div class="title" style="color:#4da6ff">MQTT</div><div class="desc">eventos de sensores</div></div>
<div class="comp" style="border-color:#4ade80"><div class="title" style="color:#4ade80">HTTP</div><div class="desc">consultas e operacao</div></div>
<div class="comp" style="border-color:#f0a020"><div class="title" style="color:#f0a020">DB</div><div class="desc">historico e relatorios</div></div>
<div class="comp" style="border-color:#c084fc"><div class="title" style="color:#c084fc">IA</div><div class="desc">fase posterior</div></div>
</div>

- Sensores/gateways enviam eventos de vaga em tempo real
- Backend processa eventos, evita duplicidade por `eventId` e atualiza o estado atual
- API REST permite consultar mapa, setores, incidentes e recomendacoes
- Banco persiste historico para relatorios e demonstracao

---

<span class="tag">STACK</span>

# Stack tecnico e arquitetura

<div class="flow">
<div class="node" style="border-color:#4ade80"><div class="h" style="color:#4ade80">SIMULADOR</div><div class="s">90 sensores + 3 gateways</div></div>
<div class="arrow">&rarr;</div>
<div class="node" style="border-color:#f0a020"><div class="h" style="color:#f0a020">BROKER</div><div class="s">Mosquitto MQTT</div></div>
<div class="arrow">&rarr;</div>
<div class="node" style="border-color:#4da6ff"><div class="h" style="color:#4da6ff">BACKEND</div><div class="s">Express + regras</div></div>
<div class="arrow">&rarr;</div>
<div class="node" style="border-color:#c084fc"><div class="h" style="color:#c084fc">DB / UI</div><div class="s">Postgres + dashboard</div></div>
</div>

| Camada | Tecnologia | Onde |
|---|---|---|
| Simulador | Node.js + `mqtt` | `src/simulator/` |
| Broker | Mosquitto (Docker) | `docker-compose.yml` |
| Backend | Node.js + Express + `pg` | `src/backend/` |
| Banco | PostgreSQL 16 (Docker) | `configs/schema.sql` |
| Dashboard | HTML + JS vanilla | `public/` |

---

<!-- _class: divider -->

# Etapa 1
## Cenario e simulacao

---

<span class="tag">1) CENARIO</span>

# Cenario - layout fixo obrigatorio

<div class="sectors-vis">
<div class="sector-vis A"><div class="name">Setor A</div><div class="grid"><div class="cell on"></div><div class="cell"></div><div class="cell on"></div><div class="cell"></div><div class="cell on"></div><div class="cell"></div><div class="cell"></div><div class="cell on"></div><div class="cell"></div><div class="cell on"></div><div class="cell on"></div><div class="cell"></div><div class="cell on"></div><div class="cell"></div><div class="cell"></div><div class="cell on"></div><div class="cell"></div><div class="cell on"></div><div class="cell"></div><div class="cell on"></div><div class="cell"></div><div class="cell"></div><div class="cell on"></div><div class="cell"></div><div class="cell on"></div><div class="cell on"></div><div class="cell"></div><div class="cell"></div><div class="cell on"></div><div class="cell"></div></div><div class="id">A-01 ... A-30</div></div>
<div class="sector-vis B"><div class="name">Setor B</div><div class="grid"><div class="cell on"></div><div class="cell on"></div><div class="cell"></div><div class="cell on"></div><div class="cell"></div><div class="cell on"></div><div class="cell on"></div><div class="cell"></div><div class="cell"></div><div class="cell on"></div><div class="cell"></div><div class="cell on"></div><div class="cell"></div><div class="cell on"></div><div class="cell on"></div><div class="cell"></div><div class="cell on"></div><div class="cell"></div><div class="cell"></div><div class="cell on"></div><div class="cell on"></div><div class="cell"></div><div class="cell"></div><div class="cell on"></div><div class="cell on"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell on"></div><div class="cell"></div></div><div class="id">B-01 ... B-30</div></div>
<div class="sector-vis C"><div class="name">Setor C</div><div class="grid"><div class="cell"></div><div class="cell on"></div><div class="cell on"></div><div class="cell"></div><div class="cell on"></div><div class="cell on"></div><div class="cell on"></div><div class="cell"></div><div class="cell"></div><div class="cell on"></div><div class="cell"></div><div class="cell"></div><div class="cell on"></div><div class="cell on"></div><div class="cell on"></div><div class="cell on"></div><div class="cell"></div><div class="cell on"></div><div class="cell"></div><div class="cell"></div><div class="cell on"></div><div class="cell"></div><div class="cell on"></div><div class="cell on"></div><div class="cell"></div><div class="cell on"></div><div class="cell"></div><div class="cell on"></div><div class="cell on"></div><div class="cell"></div></div><div class="id">C-01 ... C-30</div></div>
</div>

- 3 setores: **A**, **B** e **C**
- 30 vagas por setor (`A-01..A-30`, `B-01..B-30`, `C-01..C-30`) - **total: 90 vagas**

<span class="file green">src/simulator/layout.js + src/config.js</span>

```js
// src/config.js
sectors: ['A', 'B', 'C'],
spotsPerSector: 30,

// src/simulator/layout.js
for (const sectorId of ['A','B','C']) {
  for (let i = 1; i <= 30; i++) {
    list.push({ sectorId, spotId: `${sectorId}-${String(i).padStart(2,'0')}` });
  }
}
```

---

<span class="tag">1) CENARIO</span>

# Simulador Node.js - padroes realistas

<div class="two">
<div>

<span class="file">src/simulator/sensor.js - probabilidade por hora</span>

```js
function probabilidadeChegada(hora) {
  if (hora >=  7 && hora <  9) return 0.06;  // pico manha
  if (hora >=  9 && hora < 11) return 0.025;
  if (hora >= 11 && hora < 14) return 0.04;  // almoco
  if (hora >= 14 && hora < 17) return 0.025;
  if (hora >= 17 && hora < 19) return 0.07;  // pico tarde
  if (hora >= 19 && hora < 22) return 0.015;
  return 0.003;                               // madrugada
}
```

</div>
<div>

<span class="file orange">src/simulator/sensor.js - permanencia (30min-6h sim)</span>

```js
function escolherTempoPermanencia() {
  const r = Math.random();
  if (r < 0.55) return 30  + Math.floor(Math.random() * 60);
  if (r < 0.85) return 90  + Math.floor(Math.random() * 90);
  return                180 + Math.floor(Math.random() * 180);
}
```

</div>
</div>

**Tempo simulado:** `TICK_MS=100` -> 1 minuto sim = 100ms reais (10x mais rapido que o relogio real). A "hora do dia" vem de um relogio em [src/simulator/index.js:50-56](src/simulator/index.js#L50-L56) que avanca 1 min sim por tick.

---

<span class="tag">1) CENARIO</span>

# Sensores + gateways + injecao de falhas

<div class="three">
<div>

<span class="file green">src/simulator/sensor.js</span>
**Sensor (1 por vaga)**
- `state`: FREE/OCCUPIED
- `dwell`: tempo restante
- `fault`: falha injetada
- decide a cada tick

</div>
<div>

<span class="file orange">src/simulator/gateway.js</span>
**Gateway (1 por setor)**
- cliente MQTT proprio
- publica eventos
- heartbeat 15s
- **LWT** (Last Will)

</div>
<div>

<span class="file red">src/simulator/controlServer.js</span>
**HTTP :4000 - falhas**
- `stuck_occupied`
- `stuck_free`
- `flapping`

</div>
</div>

<span class="file red">src/simulator/sensor.js:74-86 - logica de cada falha</span>

```js
if (this.fault === 'stuck_occupied') this.state = OCCUPIED;
else if (this.fault === 'stuck_free') this.state = FREE;
else if (this.fault === 'flapping') {
  this.flapCounter++;
  if (this.flapCounter >= this.flapEvery) {
    this.state = this.state === FREE ? OCCUPIED : FREE;
    this.flapCounter = 0;
  }
}
```

```bash
curl -X POST http://localhost:4000/faults -H 'Content-Type: application/json' \
  -d '{"spotId":"A-07","fault":"stuck_occupied"}'
```

---

<!-- _class: divider -->

# Etapa 2
## MQTT - topicos e ingestao

---

<span class="tag">2) MQTT</span>

# Fluxo IoT: sensores -> MQTT -> backend

<div class="flow">
<div class="node" style="border-color:#4ade80"><div class="h" style="color:#4ade80">Sensores</div><div class="s">virtuais (90)</div></div>
<div class="arrow">&rarr;</div>
<div class="node" style="border-color:#f0a020"><div class="h" style="color:#f0a020">Gateway</div><div class="s">por setor (3)</div></div>
<div class="arrow">&rarr;</div>
<div class="node" style="border-color:#4da6ff"><div class="h" style="color:#4da6ff">Broker</div><div class="s">Mosquitto</div></div>
<div class="arrow">&rarr;</div>
<div class="node" style="border-color:#c084fc"><div class="h" style="color:#c084fc">Backend</div><div class="s">Express + DB</div></div>
</div>

**Topico obrigatorio**: `campus/parking/sectors/<sectorId>/spots/<spotId>/events`

<div class="two">
<div>

<span class="file green">src/simulator/gateway.js:69-82 - publica</span>

```js
publishSpotEvent({ spotId, state, source }) {
  const payload = {
    eventId: uuidv4(),
    ts: new Date().toISOString(),
    sectorId: this.sectorId,
    spotId, state, source,
  };
  const topic = config.topics.spotEvents(this.sectorId, spotId);
  this.mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 });
}
```

</div>
<div>

<span class="file">src/backend/index.js:148-156 - subscreve</span>

```js
mqttClient.on('connect', () => {
  mqttClient.subscribe([
    'campus/parking/sectors/+/spots/+/events',
    'campus/parking/sectors/+/gateway/status',
  ], { qos: 1 });
});
```

</div>
</div>

---

<span class="tag">2) MQTT</span>

# Payload minimo do evento

<div class="two">
<div>

<span class="file">JSON do evento</span>

```json
{
  "eventId": "uuid",
  "ts": "2026-04-29T10:15:30.000Z",
  "sectorId": "A",
  "spotId": "A-07",
  "state": "OCCUPIED",
  "source": "sensor"
}
```

**Campos que conectam o sistema:**
- `eventId` - chave para idempotencia
- `ts` - momento do evento
- `sectorId`, `spotId` - localizacao
- `state` - FREE ou OCCUPIED
- `source` - origem sensor/gateway

</div>
<div>

<span class="file">src/backend/index.js:48-68 - validacao</span>

```js
const VALID_STATES = new Set(['FREE', 'OCCUPIED']);
const REQUIRED_FIELDS = ['eventId','ts','sectorId','spotId','state'];

function parseSpotEvent(msgStr) {
  let evt;
  try { evt = JSON.parse(msgStr); }
  catch { return { ok:false, reason:'json_invalido' }; }

  for (const f of REQUIRED_FIELDS) {
    if (evt[f] == null || evt[f] === '') {
      return { ok:false, reason:`campo_ausente:${f}` };
    }
  }
  if (!VALID_STATES.has(evt.state))
    return { ok:false, reason:`state_invalido:${evt.state}` };
  return { ok: true, evt };
}
```

</div>
</div>

---

<span class="tag">2) MQTT + DB</span>

# Ingestao: idempotencia e estado atual

Regra: nao duplicar evento e manter a vaga atualizada.

<div class="three">
<div>

<span class="file orange">src/backend/db.js:24-42 - idempotencia</span>

```sql
INSERT INTO spot_events (
  event_id, ts, sector_id, spot_id,
  state, source, raw_payload
) VALUES ($1,$2,$3,$4,$5,$6,$7)
ON CONFLICT (event_id) DO NOTHING
RETURNING event_id
```

`RETURNING` devolve linha = inseriu;
nao devolve = duplicado.

</div>
<div>

<span class="file green">src/backend/db.js:48-70 - estado atual</span>

```sql
INSERT INTO spots (...)
VALUES (...)
ON CONFLICT (spot_id) DO UPDATE
  SET state = EXCLUDED.state,
      last_ts = EXCLUDED.last_ts,
      ...
WHERE spots.last_ts IS NULL
   OR EXCLUDED.last_ts >= spots.last_ts
```

Protege contra evento fora de ordem.

</div>
<div>

<span class="file">src/backend/index.js:91-101 - pipeline</span>

```js
const inserido = await db.saveEvent(evt);
if (inserido) {
  await db.updateSpotState(evt);
  await incidentDetector.processar(evt);
  await recommendationEngine
    .processSpotChange(evt.sectorId);
} else {
  stats.eventsDuplicates++;
}
```

</div>
</div>

> Logs do backend: `recv=247 inseridos=232 duplicados=15 invalidos=0`

---

<!-- _class: divider -->

# Etapa 3
## Banco de dados (Postgres)

---

<span class="tag">3) BANCO</span>

# Tabelas obrigatorias do schema

O banco guarda estado atual, historico, snapshots, incidentes e recomendacoes.

<div class="two">
<div>

<span class="file">configs/schema.sql - vagas e eventos</span>

```sql
CREATE TABLE spots (
  spot_id        TEXT PRIMARY KEY,
  sector_id      TEXT NOT NULL,
  state          TEXT NOT NULL CHECK
                 (state IN ('FREE','OCCUPIED')),
  last_event_id  UUID,
  last_ts        TIMESTAMPTZ,
  last_source    TEXT
);

CREATE TABLE spot_events (
  event_id     UUID PRIMARY KEY,
  ts           TIMESTAMPTZ NOT NULL,
  sector_id    TEXT NOT NULL,
  spot_id      TEXT NOT NULL,
  state        TEXT NOT NULL,
  source       TEXT,
  raw_payload  JSONB NOT NULL
);
```

</div>
<div>

<span class="file orange">configs/schema.sql - incidentes e recomendacoes</span>

```sql
CREATE TABLE incidents (
  id            UUID PRIMARY KEY,
  ts_open       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ts_close      TIMESTAMPTZ,
  type          TEXT NOT NULL,
  severity      TEXT NOT NULL,
  sector_id     TEXT NOT NULL,
  spot_id       TEXT,
  evidence_json JSONB,
  status        TEXT DEFAULT 'open'
);

-- so 1 incidente aberto por (vaga,tipo)
CREATE UNIQUE INDEX incidents_open_unique
  ON incidents (spot_id, type)
  WHERE status = 'open';

CREATE TABLE recommendations_log (
  ts                  TIMESTAMPTZ NOT NULL,
  from_sector         TEXT NOT NULL,
  recommended_sector  TEXT,
  reason              TEXT NOT NULL,
  data_json           JSONB
);
```

</div>
</div>

---

<span class="tag">3) BANCO</span>

# Acesso ao banco no codigo

| Arquivo | Funcao |
|---|---|
| [src/backend/pool.js](src/backend/pool.js) | Pool unico do `node-postgres` + `waitForReady()` retry no boot |
| [src/backend/db.js](src/backend/db.js) | Eventos, spots, mapa, setores, turnover, snapshots, recomendacoes |
| [src/backend/incidentDb.js](src/backend/incidentDb.js) | Queries de incidentes (com transacao) |
| [src/backend/snapshotter.js](src/backend/snapshotter.js) | Job que insere `sector_snapshots` a cada 60s |
| [configs/schema.sql](configs/schema.sql) | Schema completo (auto-aplicado pelo Postgres) |

<span class="file">src/backend/pool.js - retry no boot</span>

```js
async function waitForReady({ maxAttempts = 30, delayMs = 1000 } = {}) {
  for (let i = 1; i <= maxAttempts; i++) {
    try { await pool.query('SELECT 1'); return; }
    catch { await new Promise(r => setTimeout(r, delayMs)); }
  }
  throw new Error(`[pg] nao consegui conectar apos ${maxAttempts} tentativas`);
}
```

```yaml
# docker-compose.yml - schema.sql roda automatico na primeira subida
volumes:
  - ./configs/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
```

---

<!-- _class: divider -->

# Etapa 4
## API REST - consulta e relatorios

---

<span class="tag">4) HTTP API</span>

# Endpoints expostos pelo backend

<div class="grid2x4">
<div class="step"><span class="n">1</span><div><div class="t" style="color:#4da6ff">GET /api/v1/map</div><div class="d">Mapa atual das 90 vagas</div></div></div>
<div class="step"><span class="n">2</span><div><div class="t" style="color:#4ade80">GET /api/v1/sectors</div><div class="d">Resumo por setor (occ/free/rate)</div></div></div>
<div class="step"><span class="n">3</span><div><div class="t" style="color:#4da6ff">GET /api/v1/sectors/:id/spots</div><div class="d">Vagas detalhadas de um setor</div></div></div>
<div class="step"><span class="n">4</span><div><div class="t" style="color:#4ade80">GET /api/v1/sectors/:id/free-spots</div><div class="d">Vagas livres com ?limit=N</div></div></div>
<div class="step or"><span class="n">5</span><div><div class="t" style="color:#f0a020">GET /api/v1/reports/turnover</div><div class="d">Transicoes FREE-&gt;OCCUPIED no periodo</div></div></div>
<div class="step or"><span class="n">6</span><div><div class="t" style="color:#f0a020">GET /api/v1/recommendation</div><div class="d">Recomendacao on-demand (R-OP1)</div></div></div>
<div class="step or"><span class="n">7</span><div><div class="t" style="color:#c084fc">GET /api/v1/incidents</div><div class="d">Incidentes abertos com filtros</div></div></div>
<div class="step or"><span class="n">8</span><div><div class="t" style="color:#c084fc">GET /api/v1/recommendations</div><div class="d">Historico de recomendacoes</div></div></div>
</div>

<span class="file">src/backend/httpApi.js - exemplo de handler</span>

```js
router.get('/map', asyncHandler(async (_req, res) => {
  res.json(await db.getMap());
}));
```

---

<span class="tag">4) HTTP API</span>

# Relatorio de turnover

<span class="file orange">src/backend/db.js:198-234 - turnover via window function</span>

```sql
WITH transitions AS (
  SELECT sector_id, state, ts,
         LAG(state) OVER (PARTITION BY spot_id ORDER BY ts) AS prev_state
  FROM spot_events
)
SELECT sector_id, COUNT(*)::int AS turnover
FROM transitions
WHERE prev_state = 'FREE' AND state = 'OCCUPIED'
  AND ($1::text        IS NULL OR sector_id = $1)
  AND ($2::timestamptz IS NULL OR ts >= $2)
  AND ($3::timestamptz IS NULL OR ts <= $3)
GROUP BY sector_id;
```

`turnover` = numero de transicoes **FREE -> OCCUPIED** = "veiculos atendidos"

```bash
curl 'http://localhost:4001/api/v1/reports/turnover?sectorId=A'
curl 'http://localhost:4001/api/v1/reports/turnover?sectorId=A&from=2026-05-06T00:00Z&to=2026-05-06T23:59Z'
```

---

<!-- _class: divider -->

# Etapa 5
## Regra operacional R-OP1 (>=90%)

---

<span class="tag">5) REGRAS</span>

# R-OP1: recomendacao quando lotar

Quando `occupancyRate(setor) >= 0.90`, o backend procura o setor candidato com mais vagas livres.

<div class="two">
<div>

<span class="file orange">src/backend/recommendations.js:88-104 - borda</span>

```js
async processSpotChange(sectorId) {
  const stats = await db.getSectorOccupancy(sectorId);
  const acima = stats.occupancyRate >= 0.9;

  // borda de descida -> reseta
  if (this.acimaDoLimiar[sectorId] && !acima) {
    this.acimaDoLimiar[sectorId] = false;
    return;
  }
  if (!acima || this.acimaDoLimiar[sectorId]) return;

  // borda de subida (so dispara 1x)
  this.acimaDoLimiar[sectorId] = true;
  const reco = await this.compute(sectorId);
  await db.logRecommendation(reco);
  this.mqttPublish(topics.recommendations,
                   JSON.stringify(reco));
}
```

</div>
<div>

<span class="file green">recommendations.js:47-53 - escolha do setor</span>

```js
const candidatos = outros
  .map((s, i) => ({ sectorId: s, ...stats[i] }))
  .filter((c) => c.freeCount > 0
              && c.occupancyRate < 0.9)
  .sort((a, b) => {
    if (b.freeCount !== a.freeCount)
      return b.freeCount - a.freeCount;
    return a.sectorId.localeCompare(b.sectorId);
  });

const escolhido = candidatos[0];
```

Criterios:
1. Mais vagas livres (desc)
2. Empate -> ordem alfabetica
3. So setores abaixo do limiar

</div>
</div>

<div class="quote">
<div class="hint">Exemplo de mensagem:</div>
<div class="msg">"Sector A at 93% occupancy; Sector B has 12 free spots"</div>
<div class="meta">Registrada em recommendations_log + publicada em MQTT campus/parking/recommendations</div>
</div>

---

<span class="tag">5) REGRAS</span>

# Saida JSON da recomendacao

<div class="two">
<div>

<span class="file">GET /api/v1/recommendation?fromSector=A</span>

```json
{
  "fromSector": "A",
  "recommendedSector": "B",
  "reason": "Sector A at 93% occupancy; Sector B has 12 free spots",
  "ts": "2026-05-06T10:20:00.000Z",
  "fromOccupancyRate": 0.933,
  "candidates": [
    {"sectorId":"B","freeCount":12,"occupancyRate":0.6},
    {"sectorId":"C","freeCount":8, "occupancyRate":0.733}
  ]
}
```

</div>
<div>

**Como demonstrar ao vivo:**

```bash
# trava o setor A inteiro como ocupado
curl -X POST http://localhost:4000/faults \
  -H 'Content-Type: application/json' \
  -d '{"sectorId":"A","fault":"stuck_occupied"}'

# em alguns segundos cruza 90% -> dispara
curl 'http://localhost:4001/api/v1/recommendation?fromSector=A'
curl 'http://localhost:4001/api/v1/recommendations?limit=5'
```

A recomendacao tambem aparece no painel direito do **dashboard**.

</div>
</div>

---

<!-- _class: divider -->

# Etapa 6
## Deteccao de incidentes

---

<span class="tag">6) INCIDENTES</span>

# Tres tipos detectados pelo backend

<div class="three">
<div class="comp" style="border-color:#f87171"><div class="title" style="color:#f87171; font-size: 24px">FLAPPING</div><div class="desc">trocas rapidas demais (&gt; 6 em 60min sim)</div></div>
<div class="comp" style="border-color:#f0a020"><div class="title" style="color:#f0a020; font-size: 18px">STUCK_OCCUPIED</div><div class="desc">sempre ocupada (&gt;= 8h sim)</div></div>
<div class="comp" style="border-color:#4da6ff"><div class="title" style="color:#4da6ff; font-size: 24px">STUCK_FREE</div><div class="desc">sempre livre (&gt;= 8h sim)</div></div>
</div>

**Por que dois caminhos de deteccao?** Um sensor travado **nao publica novos eventos** - o detector orientado a evento sozinho nao pegaria.

| Tipo | Detectado por | Latencia (TICK_MS=100) |
|---|---|---|
| `FLAPPING` | **Caminho 1**: `processar(evt)` a cada evento | ~1-2s |
| `STUCK_OCCUPIED` | **Caminho 2**: scanner periodico SQL | ~48s |
| `STUCK_FREE` | **Caminho 2**: scanner periodico SQL | ~48s |

---

<span class="tag">6) INCIDENTES</span>

# Caminho 1 - FLAPPING (orientado a evento)

<span class="file red">src/backend/incidents.js:43-110 - chamado a cada evento ingerido</span>

```js
async processar(evt) {
  const h = this.historico.get(spotId);
  if (state === h.lastState) return;     // sem mudanca, sai

  h.changesInWindow.push(agora);
  h.changesInWindow = h.changesInWindow.filter(
    (t) => agora - t <= TH.flappingWindowMs
  );

  // Toda transicao recupera STUCK (sensor voltou a funcionar)
  await this._fecharSeExistir(spotId, 'STUCK_OCCUPIED');
  await this._fecharSeExistir(spotId, 'STUCK_FREE');

  if (h.changesInWindow.length > TH.flappingMaxChanges) {
    await incidentDb.openIncident({ type: 'FLAPPING', sectorId, spotId,
      evidenceJson: { trocasNaJanela: h.changesInWindow.length, janelaMs: TH.flappingWindowMs }
    });
  }
}
```

Mantem em memoria por vaga: `lastState`, `lastChangeTs`, `changesInWindow[]` (timestamps das trocas dentro da janela rolante).

---

<span class="tag">6) INCIDENTES</span>

# Caminho 2 - STUCK (scanner periodico)

<div class="two">
<div>

<span class="file orange">src/backend/incidents.js:115-156 - SQL scanner</span>

```sql
SELECT spot_id, sector_id, state, last_ts,
       EXTRACT(EPOCH FROM (NOW() - last_ts))
         AS seconds_in_state
FROM spots
WHERE last_ts IS NOT NULL
  AND last_ts < NOW()
              - ($1::bigint
                 * INTERVAL '1 millisecond')
```

Pra cada linha:
- `state='OCCUPIED'` -> abre `STUCK_OCCUPIED`
- `state='FREE'`     -> abre `STUCK_FREE`

</div>
<div>

<span class="file">src/backend/incidentDb.js:48-94 - persistencia transacional</span>

```js
async function openIncident({ type, sectorId, spotId, evidenceJson }) {
  await client.query('BEGIN');
  const exist = await client.query(
    `SELECT * FROM incidents
     WHERE spot_id=$1 AND type=$2
       AND status='open' FOR UPDATE`,
    [spotId, type]);

  if (exist.rowCount > 0) {
    // merge evidence_json + bump last_seen_at
    await client.query(`UPDATE incidents
      SET evidence_json = evidence_json || $2::jsonb,
          last_seen_at = NOW()
      WHERE id = $1`, [exist.rows[0].id, evidenceJson]);
  } else {
    await client.query(`INSERT INTO incidents (...)`);
  }
  await client.query('COMMIT');
}
```

</div>
</div>

Indice **UNIQUE parcial** em `(spot_id, type) WHERE status='open'` impede duplicar.

---

<span class="tag">6) INCIDENTES</span>

# Calibracao TICK_MS x thresholds

Threshold de STUCK precisa ser **estritamente maior** que o dwell maximo (6h sim), senao saudaveis viram STUCK.

| `TICK_MS` | Sim e... | `STUCK_THRESHOLD_MS` | `FLAPPING_WINDOW_MS` | Demo de STUCK |
|---|---|---|---|---|
| 100  | 10x rapido | 48000  | 6000  | ~48s |
| 200  | 5x rapido  | 96000  | 12000 | ~96s |
| 1000 | tempo real | 480000 | 60000 | ~8 min |

Em **todas** as linhas o spec e respeitado em **tempo simulado** (STUCK 8h, FLAPPING > 6 trocas em 60min, dwell maximo 6h).

Default deste repo: `TICK_MS=100` -> demo de STUCK em ~48s, FLAPPING em ~1-2s.

```bash
# 3 incidentes em uma demo
curl -X POST http://localhost:4000/faults -d '{"spotId":"A-07","fault":"stuck_occupied"}' -H 'Content-Type: application/json'
curl -X POST http://localhost:4000/faults -d '{"spotId":"B-12","fault":"stuck_free"}'      -H 'Content-Type: application/json'
curl -X POST http://localhost:4000/faults -d '{"spotId":"C-03","fault":"flapping"}'        -H 'Content-Type: application/json'

# espera ~50s
curl 'http://localhost:4001/api/v1/incidents?status=open'
```

---

<!-- _class: divider -->

# Etapa 7
## Demonstracao

---

<span class="tag">7) DEMO</span>

# Checklist da prova

<div class="grid2x4">
<div class="step"><span class="n">1</span><div><div class="t">Subir Mosquitto + Postgres</div><div class="d"><code>docker compose up -d</code></div></div></div>
<div class="step"><span class="n">2</span><div><div class="t">Rodar backend e simulador</div><div class="d"><code>npm run backend</code> + <code>npm start</code></div></div></div>
<div class="step"><span class="n">3</span><div><div class="t">Ver eventos MQTT no console</div><div class="d">logs do simulador / publish-subscribe</div></div></div>
<div class="step"><span class="n">4</span><div><div class="t">Abrir /map e /sectors</div><div class="d">tempo real, atualizando a cada 5s</div></div></div>
<div class="step or"><span class="n">5</span><div><div class="t">Injetar falha em uma vaga</div><div class="d">POST :4000/faults</div></div></div>
<div class="step or"><span class="n">6</span><div><div class="t">Ver incidente aberto</div><div class="d">GET /api/v1/incidents</div></div></div>
<div class="step or"><span class="n">7</span><div><div class="t">Lotar setor &gt;= 90%</div><div class="d">stuck_occupied no setor inteiro</div></div></div>
<div class="step or"><span class="n">8</span><div><div class="t">Consultar recomendacao</div><div class="d">GET /api/v1/recommendation</div></div></div>
</div>

<span class="file green">docker-compose.yml</span>

```yaml
services:
  mosquitto: { image: eclipse-mosquitto:latest, ports: ["1883:1883","9001:9001"] }
  postgres:  { image: postgres:16-alpine, ports: ["5432:5432"], ... }
```

---

<span class="tag">7) DEMO</span>

# Roteiro completo (script)

```bash
# 1) sobe broker + banco
docker compose up -d mosquitto postgres

# 2) backend (T1) e simulador (T2)
npm run backend
npm start

# 3) abrir dashboard em http://localhost:4001/
#    mostrar mapa 3x30 + cards de setor + gateways online

# 4) injetar 3 falhas (uma de cada tipo)
curl -X POST http://localhost:4000/faults -H 'Content-Type: application/json' \
  -d '{"spotId":"A-07","fault":"stuck_occupied"}'
curl -X POST http://localhost:4000/faults -H 'Content-Type: application/json' \
  -d '{"spotId":"B-12","fault":"stuck_free"}'
curl -X POST http://localhost:4000/faults -H 'Content-Type: application/json' \
  -d '{"spotId":"C-03","fault":"flapping"}'

# 5) lotar setor A pra disparar recomendacao R-OP1
curl -X POST http://localhost:4000/faults -H 'Content-Type: application/json' \
  -d '{"sectorId":"A","fault":"stuck_occupied"}'

# 6) inspecionar
curl 'http://localhost:4001/api/v1/incidents?status=open'
curl 'http://localhost:4001/api/v1/recommendation?fromSector=A'
curl 'http://localhost:4001/api/v1/reports/turnover?sectorId=A'
```

---

<span class="tag">RESUMO</span>

# O que cada etapa cobre

| Etapa | Pasta principal | Funcao |
|---|---|---|
| **1** Cenario | `src/simulator/` | Gera eventos MQTT realistas + injecao de falhas |
| **2** MQTT | `src/backend/index.js` + `db.js` | Consome MQTT, valida, idempotencia por `eventId` |
| **3** Banco | `configs/schema.sql` + `pool.js` + `snapshotter.js` | 6 tabelas Postgres, schema auto-aplicado |
| **4** REST | `src/backend/httpApi.js` | Mapa, setores, free-spots, turnover |
| **5** R-OP1 | `src/backend/recommendations.js` | Recomendacao quando setor cruza 90% |
| **6** Incidentes | `incidents.js` + `incidentDb.js` + `incidentApi.js` | FLAPPING (online) + STUCK (scanner) |
| **7** Demo | tudo junto | Checklist completo, dashboard ao vivo |

---

<!-- _class: divider -->

# Obrigado

## Perguntas?

<br>

Codigo: [Prova-Sprint2-main/](.)
Dashboard: <code>http://localhost:4001/</code>
Guia tecnico: [GUIA-PROVA.md](GUIA-PROVA.md)
