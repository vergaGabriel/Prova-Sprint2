# Guia da Prova - Estacionamento Inteligente (Sprint 2)

Mapa de **onde cada exigencia da prova esta no codigo** e **como cada coisa
funciona**. Cada secao aqui bate exatamente com uma secao do enunciado.

---

## Visao geral da arquitetura

```
+----------------+        MQTT        +-----------------+      HTTP      +----------+
|   SIMULADOR    | -----------------> |     BACKEND     | <------------- | DASHBOARD|
| (90 sensores + |   eventos JSON     | (consumer +     |   /api/v1/...  | (browser)|
|  3 gateways)   |                    |  REST + regras) |                +----------+
| :4000 control  |                    | :4001 HTTP API  |
+----------------+                    +--------+--------+
                                               |
                                               | SQL
                                               v
                                       +-----------------+
                                       |    POSTGRES     |
                                       | spots, events,  |
                                       | snapshots, etc. |
                                       +-----------------+
```

- Simulador publica eventos no broker MQTT.
- Backend consome do MQTT, valida, persiste no Postgres, aplica regras
  (recomendacao R-OP1, deteccao de incidentes) e expoe REST API.
- Dashboard estatico (HTML/JS) consome a REST API.
- Mosquitto e Postgres rodam via [docker-compose.yml](docker-compose.yml).

Como subir tudo:

```bash
docker compose up -d mosquitto postgres
npm install
npm run backend     # terminal 1
npm start           # terminal 2
# abrir http://localhost:4001/
```

---

## 1) Cenario e simulacao

### Layout fixo (A/B/C x 30 vagas)

[src/simulator/layout.js](src/simulator/layout.js) gera os 90 ids
(`A-01..A-30`, `B-01..B-30`, `C-01..C-30`). E consumido por
[src/simulator/index.js:30-35](src/simulator/index.js#L30-L35) que cria
um `Sensor` por vaga.

Os setores e o numero de vagas sao constantes em
[src/config.js:25-26](src/config.js#L25-L26):

```js
sectors: ['A', 'B', 'C'],
spotsPerSector: 30,
```

### 90 sensores + 3 gateways

- [src/simulator/sensor.js](src/simulator/sensor.js) — uma instancia por
  vaga. Mantem `state` (FREE/OCCUPIED), `dwell` (tempo de permanencia
  restante) e `fault` (falha injetada). Cada sensor decide sozinho se vai
  trocar de estado a cada tick.
- [src/simulator/gateway.js](src/simulator/gateway.js) — uma instancia por
  setor (A, B, C). Cada gateway tem **seu proprio cliente MQTT** (modela
  tres dispositivos fisicos no campus). Publica os eventos das vagas do
  setor, o status do gateway e configura o Last Will (LWT) — se o gateway
  cair sem aviso, o broker publica `{status:"offline"}` no topico de
  status sozinho.
- [src/simulator/index.js](src/simulator/index.js) — entry point. Constroi
  90 sensores + 3 gateways, espera os 3 conectarem, publica snapshot
  inicial das 90 vagas e roda o loop principal.

### Padroes realistas

[src/simulator/sensor.js:18-26](src/simulator/sensor.js#L18-L26)
implementa `probabilidadeChegada(hora)` com picos:

```
07h-09h: 0.06    (pico manha)
11h-14h: 0.04    (almoco)
17h-19h: 0.07    (pico fim de tarde)
madrugada: 0.003 (quase ninguem)
```

[src/simulator/sensor.js:32-37](src/simulator/sensor.js#L32-L37)
implementa `escolherTempoPermanencia` — 30 min a 6h sim, com vies pra
estadias curtas (55% sao 30-90min).

A "hora do dia" vem de um relogio simulado em
[src/simulator/index.js:50-56](src/simulator/index.js#L50-L56) que
avanca 1 minuto sim por tick.

### Tempo simulado

[src/config.js:29](src/config.js#L29):

```js
tickMs: parseInt(process.env.TICK_MS || '1000', 10),
```

`TICK_MS` controla quantos ms reais = 1 minuto simulado.
- `TICK_MS=1000`: tempo "real" (1s real = 1min sim)
- `TICK_MS=100`: simulador 10x mais rapido (default deste repo, pra demo)

### Modo de teste (injecao de falhas)

[src/simulator/controlServer.js](src/simulator/controlServer.js) sobe um
servidor HTTP separado em `:4000` (porta de
[src/config.js:33](src/config.js#L33)). Endpoints:

```bash
# ver estado
curl http://localhost:4000/state
curl http://localhost:4000/state/A

# injetar falha em uma vaga
curl -X POST http://localhost:4000/faults \
  -H 'Content-Type: application/json' \
  -d '{"spotId":"A-07","fault":"stuck_occupied"}'

# injetar falha em todo um setor
curl -X POST http://localhost:4000/faults \
  -H 'Content-Type: application/json' \
  -d '{"sectorId":"A","fault":"flapping"}'

# limpar
curl -X DELETE http://localhost:4000/faults
```

Tipos suportados: `stuck_occupied`, `stuck_free`, `flapping`. A logica
de cada falha esta em [src/simulator/sensor.js:74-86](src/simulator/sensor.js#L74-L86).

O dashboard tambem tem UI pra isso ([public/js/controls.js](public/js/controls.js)).

---

## 2) MQTT - topicos e mensagens

### Topicos publicados pelo simulador

Definidos em [src/config.js:51-66](src/config.js#L51-L66):

```js
campus/parking/sectors/<sectorId>/spots/<spotId>/events
campus/parking/sectors/<sectorId>/gateway/status
campus/parking/recommendations              // publicado pelo backend
```

Quem publica:

| Topico | Publisher | Quando |
|---|---|---|
| `.../spots/<id>/events` | `gateway.publishSpotEvent` em [gateway.js:69](src/simulator/gateway.js#L69) | Toda vez que um sensor muda de estado |
| `.../gateway/status` | `gateway.publishStatus` em [gateway.js:84](src/simulator/gateway.js#L84) | A cada `GATEWAY_STATUS_INTERVAL_S` segundos (default 15s) + LWT |
| `.../recommendations` | `recommendationEngine.processSpotChange` em [recommendations.js:125-130](src/backend/recommendations.js#L125-L130) | Quando um setor cruza 90% de ocupacao |

### Payload de evento de vaga

Montado em [src/simulator/gateway.js:69-82](src/simulator/gateway.js#L69-L82):

```json
{
  "eventId": "uuid v4",
  "ts": "2026-05-06T19:15:30.000Z",
  "sectorId": "A",
  "spotId": "A-07",
  "state": "OCCUPIED",
  "source": "sensor|gateway"
}
```

### Ingestao no backend - idempotencia por `eventId`

[src/backend/index.js:71-102](src/backend/index.js#L71-L102) e o pipeline:

1. `parseSpotEvent(msg)` valida campos obrigatorios e `state in {FREE,OCCUPIED}`.
2. Confere se o topico bate com o `sectorId`/`spotId` do payload.
3. Chama `db.saveEvent(evt)` — **idempotente** por `event_id`.
4. Se foi insercao nova: `db.updateSpotState(evt)` + detector de incidentes
   + motor de recomendacoes.

A idempotencia acontece no SQL, em
[src/backend/db.js:25-42](src/backend/db.js#L25-L42):

```sql
INSERT INTO spot_events (...)
VALUES (...)
ON CONFLICT (event_id) DO NOTHING
RETURNING event_id
```

Se o `RETURNING` devolve linha = inseriu agora; se nao = duplicado. Isso
e crucial porque com QoS 1 o broker reentrega mensagens.

### Atualizacao do estado atual

[src/backend/db.js:48-70](src/backend/db.js#L48-L70) faz upsert na tabela
`spots`, com protecao contra eventos fora de ordem (`WHERE last_ts IS NULL
OR EXCLUDED.last_ts >= last_ts`). Assim, se um evento atrasado chegar
depois de um mais recente, ele nao sobrescreve o estado atual.

---

## 3) Banco de dados (Postgres)

Schema completo em [configs/schema.sql](configs/schema.sql). Executado
automaticamente na primeira subida do container Postgres via bind em
`docker-entrypoint-initdb.d/` ([docker-compose.yml:23](docker-compose.yml#L23)).

| Tabela do spec | Onde | O que guarda |
|---|---|---|
| `spots` | [schema.sql:15-25](configs/schema.sql#L15-L25) | estado atual de cada vaga (upsert por `spot_id`) |
| `spot_events` | [schema.sql:30-45](configs/schema.sql#L30-L45) | historico bruto, `event_id` PRIMARY KEY (idempotencia) |
| `sector_snapshots` | [schema.sql:50-60](configs/schema.sql#L50-L60) | snapshot agregado por setor, alimentado por job |
| `incidents` | [schema.sql:65-86](configs/schema.sql#L65-L86) | anomalias detectadas; indice UNIQUE parcial em `(spot_id, type) WHERE status='open'` |
| `recommendations_log` | [schema.sql:91-101](configs/schema.sql#L91-L101) | log da regra R-OP1 |
| `gateway_status` | [schema.sql:106-111](configs/schema.sql#L106-L111) | aux: ultimo status conhecido de cada gateway |

### Acesso ao banco no codigo

- [src/backend/pool.js](src/backend/pool.js) — pool unico do `node-postgres`
  com `waitForReady()` pra retry de conexao no boot.
- [src/backend/db.js](src/backend/db.js) — todas as queries de eventos,
  spots, mapa, setores, turnover, snapshots e recomendacoes.
- [src/backend/incidentDb.js](src/backend/incidentDb.js) — queries de
  incidentes (separadas porque tem logica de transacao).
- [src/backend/snapshotter.js](src/backend/snapshotter.js) — job que
  insere uma linha em `sector_snapshots` por setor a cada
  `SNAPSHOT_INTERVAL_MS` (default 60s).

### Inspecao manual

```bash
docker exec -it parking-postgres psql -U parking -d parking

SELECT sector_id, COUNT(*) FILTER (WHERE state='OCCUPIED') AS ocup,
       COUNT(*) AS total FROM spots GROUP BY sector_id;

SELECT * FROM sector_snapshots ORDER BY ts DESC LIMIT 9;
SELECT * FROM incidents WHERE status='open';
SELECT * FROM recommendations_log ORDER BY ts DESC LIMIT 5;
```

---

## 4) HTTP API - endpoints

Servidor Express unico na porta `4001`
([src/config.js:42](src/config.js#L42)). Definido em
[src/backend/httpApi.js](src/backend/httpApi.js). Os endpoints de
incidentes vem do sub-router em
[src/backend/incidentApi.js](src/backend/incidentApi.js).

### Consulta (Etapa 4)

| Endpoint | Onde | Implementacao |
|---|---|---|
| `GET /api/v1/map` | [httpApi.js:43-48](src/backend/httpApi.js#L43-L48) | `db.getMap()` em [db.js:104-110](src/backend/db.js#L104-L110) |
| `GET /api/v1/sectors` | [httpApi.js:50-58](src/backend/httpApi.js#L50-L58) | `db.getSectorsSummary()` em [db.js:112-118](src/backend/db.js#L112-L118) |
| `GET /api/v1/sectors/:id/spots` | [httpApi.js:60-74](src/backend/httpApi.js#L60-L74) | `db.getSectorSpots()` em [db.js:147-180](src/backend/db.js#L147-L180) |
| `GET /api/v1/sectors/:id/free-spots?limit=N` | [httpApi.js:76-96](src/backend/httpApi.js#L76-L96) | `db.getFreeSpots()` em [db.js:182-187](src/backend/db.js#L182-L187) |

### Relatorios (Etapa 4)

| Endpoint | Onde |
|---|---|
| `GET /api/v1/reports/turnover?sectorId=&from=&to=` | [httpApi.js:102-123](src/backend/httpApi.js#L102-L123) |

A query SQL esta em
[db.js:198-234](src/backend/db.js#L198-L234) — usa `LAG(state) OVER
(PARTITION BY spot_id ORDER BY ts)` em `spot_events` pra contar
transicoes FREE -> OCCUPIED no intervalo. Se `from`/`to` omitidos,
conta tudo.

```bash
curl 'http://localhost:4001/api/v1/reports/turnover?sectorId=A'
curl 'http://localhost:4001/api/v1/reports/turnover?sectorId=A&from=2026-05-06T00:00:00Z&to=2026-05-06T23:59:59Z'
```

### Recomendacao (Etapa 5)

| Endpoint | Onde |
|---|---|
| `GET /api/v1/recommendation?fromSector=A` | [httpApi.js:129-147](src/backend/httpApi.js#L129-L147) |
| `GET /api/v1/recommendations` (historico) | [httpApi.js:149-160](src/backend/httpApi.js#L149-L160) |

### Incidentes (Etapa 6)

| Endpoint | Onde |
|---|---|
| `GET /api/v1/incidents?status=open&type=&sectorId=&spotId=` | [incidentApi.js:31-54](src/backend/incidentApi.js#L31-L54) |
| `GET /api/v1/incidents/:id` | [incidentApi.js:56-67](src/backend/incidentApi.js#L56-L67) |
| `GET /api/v1/incidents/stats` | [incidentApi.js:24-29](src/backend/incidentApi.js#L24-L29) |

### Extras (nao exigidos pelo spec)

- `GET /api/v1/gateways` — saude dos 3 gateways ([httpApi.js:165-170](src/backend/httpApi.js#L165-L170))
- `GET /health` — healthcheck do servico ([httpApi.js:190-192](src/backend/httpApi.js#L190-L192))
- `/` (estatico) — dashboard HTML/JS ([public/](public/))

---

## 5) Regra operacional R-OP1 (recomendacao >= 90%)

Toda a logica do motor esta em
[src/backend/recommendations.js](src/backend/recommendations.js).

### Quando dispara

[recommendations.js:88-132](src/backend/recommendations.js#L88-L132).
Apos cada update de estado em uma vaga, o backend chama
`recommendationEngine.processSpotChange(sectorId)`. O motor:

1. Le ocupacao atual do setor via `db.getSectorOccupancy`.
2. Detecta a **borda de subida** (cruzou 90% indo pra cima): so dispara
   uma vez por subida — se cair < 90% e voltar a cruzar, dispara de novo.
3. Calcula a recomendacao com `compute(fromSector)`.
4. Persiste em `recommendations_log` via `db.logRecommendation`.
5. Publica em MQTT no topico `campus/parking/recommendations` (se o
   publisher estiver disponivel).

O limiar (`recommendationThreshold = 0.9`) e configurado em
[src/config.js:39](src/config.js#L39).

### Como escolhe o setor candidato

[recommendations.js:38-82](src/backend/recommendations.js#L38-L82). Para
todos os outros setores que estao **abaixo** do limiar e tem `freeCount > 0`,
ordena por:

1. Mais vagas livres (desc).
2. Em empate, ordem alfabetica.

Pega o primeiro. Se nenhum atende (todo mundo lotado), retorna
`recommendedSector: null` com uma `reason` explicando.

### Endpoint on-demand

[httpApi.js:129-147](src/backend/httpApi.js#L129-L147) chama
`recommendationEngine.compute(fromSector)` mesmo sem ter cruzado o
limiar. Util pra testar:

```bash
curl 'http://localhost:4001/api/v1/recommendation?fromSector=A'
```

Resposta:

```json
{
  "fromSector": "A",
  "recommendedSector": "B",
  "reason": "Sector A at 93% occupancy; Sector B has 12 free spots",
  "ts": "2026-05-06T10:20:00.000Z",
  "fromOccupancyRate": 0.933,
  "candidates": [...]
}
```

### Como demonstrar

Trave o setor A inteiro como ocupado — ele cruza 90% imediatamente:

```bash
curl -X POST http://localhost:4000/faults \
  -H 'Content-Type: application/json' \
  -d '{"sectorId":"A","fault":"stuck_occupied"}'

# espera alguns segundos pra todas as vagas FREE de A reportarem OCCUPIED
curl 'http://localhost:4001/api/v1/recommendation?fromSector=A'
curl 'http://localhost:4001/api/v1/recommendations?limit=5'
```

A recomendacao tambem aparece no painel direito do dashboard.

---

## 6) Deteccao de inconsistencia (incidentes)

Toda a logica em [src/backend/incidents.js](src/backend/incidents.js).
**Dois caminhos de deteccao**, porque um sensor travado nao publica
novos eventos.

### Caminho 1 - orientado a evento (FLAPPING)

[incidents.js:43-110](src/backend/incidents.js#L43-L110). O backend
chama `incidentDetector.processar(evt)` apos cada evento ingerido.

O detector mantem em memoria, por vaga:

- `lastState`, `lastChangeTs`
- `changesInWindow`: array de timestamps das trocas dentro de uma janela
  rolante (`FLAPPING_WINDOW_MS`)

Quando `state !== lastState`:

1. Atualiza historico, push do timestamp no array, descarta os fora da
   janela.
2. Fecha qualquer `STUCK_OCCUPIED`/`STUCK_FREE` aberto pra essa vaga
   (recovery — sensor voltou a funcionar).
3. Se `changesInWindow.length > FLAPPING_MAX_CHANGES` -> abre
   `FLAPPING` via `incidentDb.openIncident`.
4. Senao, fecha qualquer `FLAPPING` aberto (estabilizou).

A detecao e **simetrica** em direcao (FREE->OCCUPIED ou OCCUPIED->FREE,
nao importa).

### Caminho 2 - scanner periodico (STUCK)

[incidents.js:115-156](src/backend/incidents.js#L115-L156). Roda em
intervalo `STUCK_SCAN_INTERVAL_MS`, varre a tabela `spots`:

```sql
SELECT spot_id, sector_id, state, last_ts,
       EXTRACT(EPOCH FROM (NOW() - last_ts)) AS seconds_in_state
FROM spots
WHERE last_ts IS NOT NULL
  AND last_ts < NOW() - ($1::bigint * INTERVAL '1 millisecond')
```

Para cada linha, abre `STUCK_OCCUPIED` (se `state='OCCUPIED'`) ou
`STUCK_FREE` (se `state='FREE'`). O indice UNIQUE parcial em
[schema.sql:81-83](configs/schema.sql#L81-L83) impede duplicar:

```sql
CREATE UNIQUE INDEX incidents_open_unique
  ON incidents (spot_id, type)
  WHERE status = 'open';
```

O scanner e iniciado em
[src/backend/index.js:135-136](src/backend/index.js#L135-L136) e parado
em [index.js:202](src/backend/index.js#L202).

### Persistencia (com transacao)

[src/backend/incidentDb.js:48-94](src/backend/incidentDb.js#L48-L94).
`openIncident` usa `BEGIN` + `SELECT ... FOR UPDATE` pra evitar corrida
quando dois eventos disparam o detector ao mesmo tempo. Se ja existe
incidente aberto pra `(spot_id, type)`, faz **merge** do `evidence_json`
(via `||` do JSONB) e atualiza `last_seen_at`. Senao, insere novo.

Recovery acontece via `closeIncident` em
[incidentDb.js:99-114](src/backend/incidentDb.js#L99-L114).

### Calibracao (TICK_MS x thresholds)

A regra de ouro: o threshold de STUCK precisa ser estritamente maior que
o **dwell maximo** do simulador (6h sim), senao vagas saudaveis viram
STUCK. Os tres valores devem andar juntos com `TICK_MS`:

| `TICK_MS` | `STUCK_THRESHOLD_MS` | `FLAPPING_WINDOW_MS` |
|---|---|---|
| 100  | 48000  | 6000  |
| 200  | 96000  | 12000 |
| 1000 | 480000 | 60000 |

O default deste repo e `TICK_MS=100` (sim 10x mais rapido). Em todas as
linhas o spec e respeitado em **tempo simulado** (STUCK 8h, FLAPPING > 6
trocas em 60min, dwell maximo 6h sim).

### Tempos esperados na demo (TICK_MS=100)

| Falha injetada | Aparece em `/incidents` |
|---|---|
| `flapping`        | ~1-2s apos a graca de boot expirar (3s) |
| `stuck_occupied`  | ~48s apos injetar |
| `stuck_free`      | ~48s apos injetar |

Vagas saudaveis nao geram incidente.

### Como demonstrar

```bash
curl -X POST http://localhost:4000/faults -H 'Content-Type: application/json' \
  -d '{"spotId":"A-07","fault":"stuck_occupied"}'
curl -X POST http://localhost:4000/faults -H 'Content-Type: application/json' \
  -d '{"spotId":"B-12","fault":"stuck_free"}'
curl -X POST http://localhost:4000/faults -H 'Content-Type: application/json' \
  -d '{"spotId":"C-03","fault":"flapping"}'

# espera ~50s
curl 'http://localhost:4001/api/v1/incidents?status=open'
```

Os 3 tipos aparecem no painel "Incidentes abertos" do dashboard e as
vagas viram laranja no mapa.

---

## 7) Checklist de demonstracao

| Item do checklist | Como mostrar | Onde no codigo |
|---|---|---|
| Subir Mosquitto + servicos + banco | `docker compose up -d mosquitto postgres` + `npm run backend` + `npm start` | [docker-compose.yml](docker-compose.yml) |
| Simulador gerando eventos MQTT | logs do `npm start`, ou inspecionar broker (HiveMQ web client) | [src/simulator/](src/simulator/) |
| `/map` e `/sectors` em tempo real | `curl http://localhost:4001/api/v1/map` ou abrir o dashboard | [httpApi.js:43-58](src/backend/httpApi.js#L43-L58) |
| Injetar falha e ver incidente | `POST :4000/faults` + `GET :4001/api/v1/incidents` | [controlServer.js](src/simulator/controlServer.js) + [incidents.js](src/backend/incidents.js) |
| Lotar setor (>= 90%) e ver recomendacao | `POST :4000/faults` com `sectorId+stuck_occupied` + `GET :4001/api/v1/recommendation` | [recommendations.js](src/backend/recommendations.js) |

---

## Estrutura final do projeto

```
Prova-Sprint2-main/
├── docker-compose.yml          # Mosquitto + Postgres
├── package.json                # scripts: npm start (sim), npm run backend
├── .env / .env.example         # config (TICK_MS, thresholds, portas)
├── README.md                   # readme original
├── GUIA-PROVA.md               # este arquivo
│
├── configs/
│   ├── mosquitto.conf          # broker
│   └── schema.sql              # ETAPA 3: tabelas Postgres
│
├── src/
│   ├── config.js               # constantes + tópicos MQTT
│   ├── simulator/              # ETAPA 1
│   │   ├── index.js            # entry: 90 sensores + 3 gateways + loop
│   │   ├── layout.js           # gera A-01..C-30
│   │   ├── sensor.js           # state machine de 1 vaga (+ falhas)
│   │   ├── gateway.js          # cliente MQTT por setor + LWT
│   │   ├── monitor.js          # alerta interno do sim (>= 80%)
│   │   └── controlServer.js    # HTTP :4000 pra injetar falha
│   │
│   └── backend/                # ETAPAS 2-6
│       ├── index.js            # ETAPA 2: subscriber MQTT + roteamento
│       ├── pool.js             # ETAPA 3: pool node-postgres
│       ├── db.js               # ETAPA 3+4: persistencia + queries de leitura
│       ├── snapshotter.js      # ETAPA 3: job sector_snapshots
│       ├── httpApi.js          # ETAPA 4+5: API HTTP unificada (:4001)
│       ├── recommendations.js  # ETAPA 5: motor R-OP1
│       ├── incidents.js        # ETAPA 6: detector FLAPPING + scanner STUCK
│       ├── incidentDb.js       # ETAPA 6: storage de incidentes
│       └── incidentApi.js      # ETAPA 6: router /api/v1/incidents
│
└── public/                     # dashboard estatico (extra)
    ├── index.html
    ├── styles.css
    └── js/
        ├── main.js             # bootstrap + polling 5s
        ├── api.js              # wrappers fetch
        ├── controls.js         # UI de injecao de falha
        ├── icons.js
        └── render/
            ├── map.js          # grid 3x30
            ├── sectors.js      # cards de ocupacao
            ├── incidents.js    # lista de incidentes abertos
            ├── recommendation.js
            └── gateways.js     # bolinhas online/offline
```

---

## Resumo: o que cada etapa cobre

| Etapa | Pasta principal | Funcao |
|---|---|---|
| 1 - Cenario/simulacao | [src/simulator/](src/simulator/) | gera eventos MQTT realistas + injecao de falhas |
| 2 - MQTT/ingestao | [src/backend/index.js](src/backend/index.js) + [db.js](src/backend/db.js) | consome MQTT, valida, idempotencia por `eventId` |
| 3 - Banco | [configs/schema.sql](configs/schema.sql) + [pool.js](src/backend/pool.js) + [snapshotter.js](src/backend/snapshotter.js) | 6 tabelas Postgres, schema auto-aplicado |
| 4 - REST/relatorios | [httpApi.js](src/backend/httpApi.js) | mapa, setores, free-spots, turnover |
| 5 - Recomendacao | [recommendations.js](src/backend/recommendations.js) | regra R-OP1 (>= 90%) |
| 6 - Incidentes | [incidents.js](src/backend/incidents.js) + [incidentDb.js](src/backend/incidentDb.js) + [incidentApi.js](src/backend/incidentApi.js) | FLAPPING (online) + STUCK (scanner periodico) |
