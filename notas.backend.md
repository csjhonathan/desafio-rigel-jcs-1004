# Integração com a API PJE (Comunica) — notas e impedimentos

Notas de **backend** (integração PJE, Docker, seed, etc.). Documento vivo para **registar problemas técnicos** e/ou **soluções adotadas** durante o desenvolvimento.

---

## Uso de IA no desenvolvimento

- **Assistência em implementação:** apoio na leitura da documentação da API (parâmetros `dataDisponibilizacaoInicio/Fim`, `itensPorPagina`, limites de 10 000 resultados, cabeçalhos de rate limit), alinhamento do cliente HTTP (`PjeApiClient`) e do fluxo de sincronização.
- **Depuração de ambiente:** diagnóstico de falhas com Docker (Compose, `localhost` vs rede interna, `dist`/`node_modules` com volumes, `next.config` no Next 14).

---

## Estado atual da solução

| Peça | Função |
|------|--------|
| **`PjeApiClient`** | Consulta `GET …/comunicacao` com `itensPorPagina=5`, datas no formato `yyyy-mm-dd`, paginação por `pagina`. |
| **Pausas entre páginas** | Reduzir `429`; configurável com `PJE_PAGE_DELAY_MS`. |
| **Concorrência por dia** | `syncLastDays` processa dias em **lotes** (`PJE_SYNC_DAY_CONCURRENCY`, predefinido **1**, máx. 8). |
| **429** | Espera de 60 s e retentativas (conforme orientação da API). |
| **`SyncCommunicationsJob` + seed** | Popular/atualizar comunicações e destinatários via **upsert**; o seed atual só corre a sync quando **não há** comunicações (para ressincronizar: esvaziar tabela / `prisma migrate reset` ou acrescentar de novo um `SEED_FORCE_SYNC` no `seed.ts`). |
| **Alternativa a “só API”** | Dados persistidos na base após primeira sync; listagem e filtros (ex.: tribunal) na aplicação sobre dados locais. |

---

## Problemas encontrados e mitigações

*(Marcar com `[x]` resolvido, `[ ]` em aberto.)*

### Rate limiting (`429`)

- **Problema:** muitas páginas seguidas (5 itens por pedido) geram tráfego alto; a API devolve `429` e cabeçalhos `x-ratelimit-*`.
- **Mitigação:** atraso entre páginas (`PJE_PAGE_DELAY_MS`), atraso extra quando `remaining` é baixo, retentativa após 60 s; concorrência limitada entre **dias** (não `Promise.all` em todos os dias de uma vez).

### Limite de ~10 000 resultados

- **Problema:** a documentação indica que certas combinações de filtros limitam a 10 000 resultados; para um **dia nacional** o `count` pode ser ≥ 10 000.
- **Mitigação:** log de aviso; aceitar que a lista da API pode truncar para esse perfil de consulta. **Em aberto:** estratégias adicionais (ex.: partição por critério permitido pela API, se no futuro fizer sentido e for permitido).

### Consulta sem `siglaTribunal`

- **Problema:** a API exige pelo menos um filtro “forte” **ou** `itensPorPagina=5`.
- **Mitigação:** usar sempre `itensPorPagina=5` quando não há outros filtros, com paginação completa do dia (todos os tribunais na resposta agregada).

### Docker / rede

- **Problema:** o Next no container chamava `localhost:3001` no servidor → não alcançava o Nest.
- **Mitigação:** `API_URL_INTERNAL=http://backend:…` no Compose; `getApiBaseUrl()` no cliente HTTP do frontend.

### Performance do seed

- **Problema:** 20 dias × milhares de páginas é intrinsecamente lento.
- **Mitigação:** lotes de dias em paralelo (`PJE_SYNC_DAY_CONCURRENCY`); ajuste fino de delay e concorrência conforme 429.

### Seed no `docker compose up` + healthcheck **unhealthy**

- **Problema:** `RUN_SEED=true` no comando do backend corria **antes** de `node dist/src/main`. O seed demora (PJE, 429, esperas de 60 s) e o **HTTP nunca arrancava** a tempo → healthcheck falhava → `dependency failed to start: … backend is unhealthy` → frontend não subia.
- **Mitigação:** **remover o seed do arranque** do container. Fluxo: `docker compose up` → backend fica healthy → `docker compose exec backend npm run seed` à parte (ou `npm run seed --prefix backend` no host).

---

## Mock de dados (se precisarem)

- **Ainda não há** um mock HTTP dedicado da PJE neste repositório.
- **Alternativas possíveis** (para iterar): gravar fixtures JSON de uma resposta real (anonimizada) e apontar o `PjeApiClient` para ficheiro em `NODE_ENV=test`; ou usar `msw`/`nock` nos testes.
- **Seed com Prisma:** continua a ser o caminho principal para “base prepopulada” após uma sync bem-sucedida.

---

## Como iterar neste ficheiro

1. Ao encontrar um novo erro da API ou do ambiente, acrescentar uma linha em **Problemas encontrados**.
2. Registar a **decisão** (mesmo que seja “aceite com documentação”).
3. Atualizar **Uso de IA** quando fecharem a narrativa para o desafio.

---

*Última atualização: documento criado para suportar iteração contínua; mantê-lo alinhado ao README principal quando houver conclusões estáveis.*
