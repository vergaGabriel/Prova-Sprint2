# Estacionamento Inteligente - Sprint 2

Trabalho de IoT (Sprint 2). Esta entrega cobre **Etapas 1, 2, 3, 4, 5 e 6** — completa.
Persistencia em **Postgres** (Etapa 3), schema em `configs/schema.sql`.

## Estrutura

```
parking-iot/
├── package.json
├── docker-compose.yml            # mosquitto + postgres
├── .env.example
├── README.md
├── configs/
│   ├── mosquitto.conf
│   └── schema.sql                # ETAPA 3: tabelas Postgres
└── src/
    ├── config.js                 # config compartilhado entre sim e backend
    ├── simulator/                # ETAPA 1
    │   ├── index.js              # entry: cria sensores+gateways, roda loop
    │   ├── layout.js             # matriz 3x30
    │   ├── sensor.js             # state machine de uma vaga
    │   ├── gateway.js            # cliente MQTT por setor + LWT
    │   ├── monitor.js            # detector de anomalias + alerta 80%
    │   └── controlServer.js      # HTTP de injecao de falhas (:4000)
    └── backend/
        ├── index.js              # ETAPA 2: subscriber MQTT + roteamento
        ├── pool.js               # ETAPA 3: pool node-postgres
        ├── db.js                 # ETAPA 3: persistencia (Postgres)
        ├── incidents.js          # ETAPA 6: detector stuck/flapping
        ├── incidentDb.js         # ETAPA 6: storage de incidentes (Postgres)
        ├── incidentApi.js        # ETAPA 6: router /api/v1/incidents
        ├── recommendations.js    # ETAPA 5: motor R-OP1 (>=90%)
        ├── snapshotter.js        # ETAPA 3: job de sector_snapshots
        └── httpApi.js            # ETAPA 4+5+6: API HTTP unificada (:4001)
```

## Como rodar

### Setup uma vez

```bash
npm install
cp .env.example .env
# edite o .env: TOPIC_NAMESPACE com algo unico seu (ou vazio pra topicos exatos do spec)
```

### 1) Sobe Mosquitto e Postgres (Docker)

```bash
docker compose up -d mosquitto postgres
```

O Postgres roda `configs/schema.sql` automaticamente na **primeira** subida
(volume `pgdata` vazio). Pra recriar do zero, derrube com `docker compose down -v`.

### 2) Backend e simulador (DOIS terminais)

**Terminal 1 - Backend:**
```bash
npm run backend
```
O backend espera o Postgres ficar pronto antes de subscrever no broker.

**Terminal 2 - Simulador:**
```bash
npm start
```

## Como verificar a idempotencia

Os logs do backend mostram em tempo real:

```
[backend] recv=247 inseridos=232 duplicados=15 invalidos=0 | DB events=232 spots=90 ocup=27/90
```

`duplicados > 0` significa que o broker entregou alguns eventos duas vezes (acontece com QoS 1) e o backend ignorou - exatamente o comportamento exigido pela prova.

## Etapa 1 - Cenario e Simulacao

| Requisito | Status |
|---|---|
| Layout A,B,C x 30 (matriz 3x30) | OK |
| 90 sensores + 3 gateways | OK |
| Padroes realistas (picos manha/tarde, dwell 30min-6h) | OK |
| Tempo simulado configuravel | OK |
| Modo de teste: stuck_occupied / stuck_free / flapping | OK |
| Bonus: alerta 80%, deteccao stuck/flapping/nunca usada | OK |

### Modo de teste (HTTP em :4000)

```bash
# Ver estado de um setor
curl http://localhost:4000/state/A

# Injetar falha numa vaga
curl -X POST http://localhost:4000/faults \
  -H 'Content-Type: application/json' \
  -d '{"spotId":"A-07","fault":"stuck_occupied"}'

# Travar setor inteiro (testa alerta 80%)
curl -X POST http://localhost:4000/faults \
  -H 'Content-Type: application/json' \
  -d '{"sectorId":"A","fault":"stuck_occupied"}'

# Limpar
curl -X DELETE http://localhost:4000/faults
```

## Etapa 2 - MQTT e Backend

### Topicos publicados pelo simulador

```
<NS>/campus/parking/sectors/<X>/spots/<Y>/events       (eventos de vaga)
<NS>/campus/parking/sectors/<X>/gateway/status         (saude do gateway, retain)
<NS>/campus/parking/sectors/<X>/alerts                 (anomalias, bonus)
```

`<NS>` e o `TOPIC_NAMESPACE` do `.env`. Se vazio, os topicos viram exatos `campus/parking/...`.

### Payload de evento de vaga

```json
{
  "eventId": "uuid",
  "ts": "2026-05-02T19:15:30.000Z",
  "sectorId": "A",
  "spotId": "A-07",
  "state": "OCCUPIED",
  "source": "sensor"
}
```

### O que o backend faz

1. **Subscreve** em `<NS>/campus/parking/sectors/+/spots/+/events` e em `.../gateway/status`
2. Para cada evento:
   - Valida campos obrigatorios e `state in {FREE, OCCUPIED}`
   - Confere se o topico bate com o `sectorId/spotId` do payload
   - Chama `db.saveEvent(evt)` - **idempotente por eventId**
   - Se foi insercao nova, chama `db.updateSpotState(evt)` (com protecao contra eventos fora de ordem)

### Idempotencia (requisito da prova)

O `db.js` usa um `Map` indexado por `eventId`. A funcao `saveEvent`:
- retorna `true` na **primeira** vez que ve aquele `eventId`
- retorna `false` em qualquer chamada subsequente com o mesmo `eventId`

Isso garante que retransmissoes do broker (ou retries de QoS 1) nao geram duplicatas no historico nem multiplas atualizacoes do estado atual.

### Last Will (LWT)

Cada gateway, ao conectar, registra junto ao broker uma "ultima vontade":
*"se eu cair sem avisar, publica esse JSON no meu topico de status com retain=true"*.

Resultado: se voce matar o simulador na marra (Task Manager / fechar janela), em ~30s o broker publica sozinho `{"status":"offline","reason":"unexpected_disconnect"}` em cada um dos 3 topicos `gateway/status`. O backend captura e marca o gateway como offline.

## Etapa 3 - Persistencia (Postgres)

Schema completo em `configs/schema.sql`. Tabelas:

| Tabela | Conteudo |
|---|---|
| `spots` | estado atual de cada vaga (upsert por `spot_id`) |
| `spot_events` | historico bruto, **PK em `event_id`** = idempotencia |
| `sector_snapshots` | snapshot por minuto, alimentado por `snapshotter.js` |
| `incidents` | anomalias detectadas (Etapa 6); indice UNIQUE parcial em `(spot_id, type) WHERE status='open'` |
| `recommendations_log` | log da regra R-OP1 (Etapa 5) |
| `gateway_status` | ultimo status conhecido de cada gateway (auxiliar) |

### Idempotencia no DB

`saveEvent` faz `INSERT ... ON CONFLICT (event_id) DO NOTHING RETURNING event_id`. Se a clausula
`RETURNING` devolve uma linha = insercao nova; senao = duplicado. Assim, retransmissoes
do broker (QoS 1) nunca poluem o historico nem disparam re-processamento.

### Inspecionar o banco

```bash
docker exec -it parking-postgres psql -U parking -d parking

# alguns selects uteis:
SELECT sector_id, COUNT(*) FILTER (WHERE state='OCCUPIED') AS ocup,
       COUNT(*) AS total FROM spots GROUP BY sector_id;

SELECT * FROM sector_snapshots ORDER BY ts DESC LIMIT 9;

SELECT * FROM incidents WHERE status='open';

SELECT * FROM recommendations_log ORDER BY ts DESC LIMIT 5;
```

## Etapa 4 - HTTP API (consulta + relatorios)

Servidor Express unificado em `:4001`. Todos os endpoints sob `/api/v1`:

```
GET /api/v1/map                                  mapa atual (setores + vagas)
GET /api/v1/sectors                              resumo por setor
GET /api/v1/sectors/:sectorId/spots              vagas de um setor
GET /api/v1/sectors/:sectorId/free-spots?limit=N
GET /api/v1/reports/turnover?sectorId=A&from=&to=
```

Exemplo:

```bash
curl http://localhost:4001/api/v1/sectors
curl http://localhost:4001/api/v1/sectors/A/free-spots?limit=5
curl 'http://localhost:4001/api/v1/reports/turnover?sectorId=A'
```

`turnover` = numero de transicoes `FREE -> OCCUPIED` no intervalo (proxy de
"veiculos atendidos"). Se `from`/`to` omitidos, conta tudo desde o boot.

## Etapa 5 - Recomendacoes (R-OP1)

Quando um setor cruza `>= 90%` de ocupacao, o backend:

1. Calcula a recomendacao (setor candidato com mais vagas livres, abaixo do limiar)
2. Loga em `recommendations_log`
3. Publica em MQTT `campus/parking/recommendations`

Tambem dispoe de calculo on-demand:

```bash
curl 'http://localhost:4001/api/v1/recommendation?fromSector=A'
# {
#   "fromSector": "A",
#   "recommendedSector": "B",
#   "reason": "Sector A at 93% occupancy; Sector B has 12 free spots",
#   "ts": "2026-04-29T10:20:00.000Z",
#   "fromOccupancyRate": 0.933,
#   "candidates": [...]
# }

curl http://localhost:4001/api/v1/recommendations
```

A borda de subida e detectada uma unica vez: o motor so dispara de novo
quando o setor cair abaixo de 90% e voltar a cruzar.

## Etapa 6 - Incidentes (stuck / flapping)

Detector roda online a cada evento ingerido. Tipos:

- `STUCK_OCCUPIED`: vaga sempre ocupada por >= 8h simuladas
- `STUCK_FREE`: vaga sempre livre por >= 8h simuladas
- `FLAPPING`: > 6 trocas em 60 min simulados

```bash
curl http://localhost:4001/api/v1/incidents
curl 'http://localhost:4001/api/v1/incidents?status=open'
curl 'http://localhost:4001/api/v1/incidents?type=FLAPPING'
curl http://localhost:4001/api/v1/incidents/stats
```

Incidentes sao **fechados automaticamente** quando a vaga volta ao normal.

## Inspecao via MQTT externo (opcional)

Pra ver o trafego MQTT em tempo real sem instalar nada, abre [HiveMQ Web Client](https://www.hivemq.com/demos/websocket-client/):

1. Host: `broker.hivemq.com`, Port: `8000`
2. Connect
3. Subscribe em `<seu-namespace>/campus/parking/#`

Voce vai ver tudo o que o simulador esta publicando ao vivo.
