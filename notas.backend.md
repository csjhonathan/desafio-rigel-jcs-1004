# Notas de backend

Registo de impedimentos técnicos e decisões.

## Requisito funcional vs. volume na API

O desafio pedia comunicações dos **últimos 20 dias**, não **todas** as comunicações existentes nesse período. Por isso faz sentido **cortar por páginas por dia** (`PJE_SYNC_MAX_PAGES_PER_DAY`, ex. 10 páginas × 5 itens = 50 registros/dia): cumpre-se o recorte temporal e a existência de dados representativos, sem obrigar a ingestão completa do DJE (que esbarra em rate limit, tempo e limite documentado da API).

Se no futuro quiserem **mais volume**, basta subir esse teto — aceitando mais chamadas à PJE e maior risco de `429` (ajustar `PJE_PAGE_DELAY_MS` e concorrência de dias em conformidade).

### Evolução da busca na PJE

**1. Contexto antigo (requisito vs. volume):** consulta só por data com `itensPorPagina=5` quando não há filtro estreito, com **teto** de páginas por dia (`PJE_SYNC_MAX_PAGES_PER_DAY`, etc.).

**2. Intermédio — sync por tribunal (removida):** para cada dia em BRT, iterávamos **cada sigla** de **`GET …/comunicacao/tribunal`** (cache), com **`siglaTribunal` + `itensPorPagina=100`** até a última página. **Motivo na época:** menos HTTP por dia em dias muito carregados. **Problema prático:** ingestão nacional completa + `content` integral estourava Postgres pequeno (ex. 500 MB) em poucos dias; o seed de 20 dias não cabia no disco.

**3. Estado atual — 5 itens por página + teto diário:**

- **Sem** `siglaTribunal`: um único fluxo `GET /comunicacao` por dia, **`itensPorPagina=5`** (exigência da API sem filtro estreito).
- **Variável de ambiente** `PJE_COMMUNICATION_LIMIT_PER_DAY` (predef. **2500**): máximo de comunicações **processadas por dia civil** em cada sync. Ordem típica: primeiras páginas globais do dia (mais requisições HTTP que o modo 100/tribunal, mas volume persistido controlado).
- **Critério de parada por dia:** (a) a página indica fim — mesmo critério de antes com tamanho 5: se `count` na resposta for ≤ 5, trata-se como tamanho da página; se `count` for o total do filtro &gt; 5, usa-se `items.length`; para quando esse valor é **&lt; 5**; ou (b) o acumulado do dia **atinge** `PJE_COMMUNICATION_LIMIT_PER_DAY` (última página pode ser truncada para não ultrapassar o teto).
- **Ordem de grandeza:** 20 dias × 2500 ≈ **50 000** comunicações no seed (menos linhas que sync nacional ilimitada, mas **janela temporal maior** coberta de forma previsível para disco e rate limit).
- **Persistência:** mantém-se `on_page` no `PjeApiClient` + upsert por lote no job; **`SyncLog.total_fetched` / `total_stored`** com **`increment`** por lote; retorno do job com **`readSyncLogCounts`**.

## Filtro `start_date` / `end_date` (comunicações)

**Problema:** Com `new Date('YYYY-MM-DD')`, o motor trata a data como **meia-noite UTC**. Em Brasília isso cai no **fim da noite do dia anterior** (ex.: `2026-04-09` → `2026-04-09T00:00:00.000Z` = 08/04 21:00 BRT). O `gte` desse valor incluía registros ainda “do dia 08” na UI.

**Solução:** Interpretar `YYYY-MM-DD` como **dia civil em Brasília** (`T00:00:00-03:00`, offset fixo; sem horário de verão no Brasil desde 2019). Limite superior com **`lt` no início do dia seguinte** em BRT (intervalo meio-aberto), em vez de `lte` na mesma meia-noite UTC. DTO restringe o formato a `YYYY-MM-DD` para alinhar com esse contrato. Ver `brazil-calendar-day.ts` e `CommunicationsRepository.findAll`.

## Componentes

| Peça | Notas |
|------|--------|
| `PjeApiClient` | **Atual:** `GET /comunicacao` só com datas + paginação, **`itensPorPagina=5`**, parada quando página &lt; 5 itens ou **`PJE_COMMUNICATION_LIMIT_PER_DAY`**; opcional `on_page`. **Histórico:** por sigla + 100 itens; antes disso, 5 itens + cap de páginas. |
| Cron `syncForYesterday` | Ontem (BRT); `fetchCommunications` + `on_page` (upsert por lote). |
| `syncForDate` / `syncLastDays` | Mesmo fluxo por dia (teto diário via env); `syncLastDays` agrega N dias num único `SyncLog`. |
| Rate limit | `PJE_PAGE_DELAY_MS`; retentativa após 60s em `429`; cabeçalhos `x-ratelimit-*`. |
| `syncLastDays` | Dias civis em **BRT** (`brazilTodayYmd` + `addCalendarDaysYmd`); **não inclui hoje**. Lotes: `PJE_SYNC_DAY_CONCURRENCY` (predef. 1, máx. 8). |
| Seed | Sync só se a base **não** tiver comunicações. Repovoar: `prisma migrate reset` ou lógica extra no `seed.ts`. |
| Docker seed | Não corre no `CMD` do backend (bloqueava HTTP → healthcheck falhava). Depois do `up`: `docker compose exec backend npm run seed`. |

## Bloqueio de IP: Railway/GitHub Actions → PJE

### O problema

Em produção, toda requisição do backend para a API do PJE retornava `403 Forbidden`. Localmente funcionava sem problema nenhum. Depois de alguma investigação, ficou claro que o PJE bloqueia requisições vindas de IPs de datacenters — AWS, GCP, Cloudflare, tc. . O Railway roda em cima de AWS, e o GitHub Actions também. Então qualquer tentativa de chamar a API de lá batia em muro.

A primeira coisa que tentei foi adicionar um `User-Agent` de navegador nas requisições, porque a API claramente esperava uma chamada de browser. Ajudou a eliminar outros erros, mas o `403` continuava — não era só o header, era mesmo o IP.

### Tentativas que não funcionaram

**Cloudflare Workers:** A ideia era criar um proxy no Worker que repassasse as chamadas ao PJE. Parecia ótimo no papel — URL fixa, gratuito, zero manutenção. O problema é que o Worker roda nos servidores da própria Cloudflare, que também são datacenter. O PJE viu `asOrganization: "Amazon Technologies Inc."` no log (o IP original era do Railway) e bloqueou do mesmo jeito. Trocar de datacenter para outro datacenter não resolve nada.

**GitHub Actions como proxy de sync:** Não funcionou, pois também bateu no problema de ter o ip bloqueado, então não satisfez ao propósito.

### A solução: proxy residencial via ngrok

A única (gratuita e rápida) que consegui pensar foi fazer a requisição partir de um IP residencial — aquele que o PJE não bloqueia. Tenho um PC em casa que pode ficar ligado o tempo todo, então montei um proxy reverso mínimo em Node.js (sem dependências externas, só módulos nativos) que roda lá.

O fluxo ficou assim:

```
Railway → ngrok URL → PC residencial (IP residencial) → PJE ✅
```

O ngrok expõe o proxy local, apesar de o domínio não ser fixo, não será problema pois esse PC fica ligado 24/7, obviamente em outros cenários teriamos que pensar numa solução pra isso. Então configurei esse domínio no Railway como `PJE_API_BASE_URL` e o backend não precisou mudar em nada — ele continua chamando o mesmo endpoint, só que agora o destino final é o PC em casa.

Um detalhe que apareceu na prática: o ngrok exibe uma página HTML de aviso ("You are about to visit...") para requisições que não incluem o header `ngrok-skip-browser-warning`. O backend tentava fazer parse de JSON e recebia HTML — `Unexpected token 'Y', "You are ab"...`. A correção foi adicionar esse header nas requisições do `PjeApiClient`. O PJE ignora headers desconhecidos, então não tem efeito colateral.

O proxy e as instruções de setup estão em `pje-proxy/`. Ver também a seção **Proxy PJE** no `README.md`.

## SyncLog — rastreabilidade das execuções

O requisito pedia "registrar log da execução (sucesso, quantidade de registros obtidos, erros)". A implementação inicial atendia no mínimo, mas tinha dois problemas sérios.

**Problema 1: um log por dia, não por execução**

O método `syncDay` criava um `SyncLog` para cada dia processado. No seed de 20 dias, isso gerava 20 entradas — o que tecnicamente até faz sentido do ponto de vista de granularidade, mas não reflete "uma execução do job". A correção foi extrair a criação do log para um wrapper privado `withSyncLog`, e fazer `syncLastDays` chamar o nível interno (`executeSyncDay`) diretamente sem passar pelo wrapper. Assim, cada ponto de entrada público (`syncForYesterday`, `syncForDate`, `syncLastDays`) gera exatamente 1 `SyncLog`, independente de quantos dias processa.

**Problema 2: schema sem timing e sem distinção de contagens**

O schema original só tinha `executed_at` e `total_synced`. Não dava para saber quanto tempo uma execução demorou, nem quantas comunicações eram realmente novas versus atualizações de registros já existentes. Reestruturamos o modelo:

- `executed_at` → `started_at` (criado no início da execução)
- `ended_at` adicionado (preenchido ao final — nulo enquanto está em andamento)
- `total_synced` separado em `total_fetched` (obtidos da API do PJE) e `total_stored` (realmente inseridos no banco pela primeira vez)

Para distinguir insert de update no Prisma — que não expõe isso nativamente no `upsert` — fizemos um `findUnique` antes de cada `upsert` no repository. O custo é uma query extra por registro, mas é aceitável para o volume que estamos processando.

O log é criado no início com `success: false` e atualizado ao final com os dados reais. Isso garante que, mesmo se o processo for interrompido, existe um registro da tentativa.

**Evolução:** os totais deixaram de ser só gravados no fechamento: **`total_fetched`** e **`total_stored`** passaram a ser incrementados no banco **a cada página** da PJE (`increment` no Prisma), para o front (polling em `/sync/logs`) acompanhar o progresso; o `update` final marca `ended_at` e `success` sem sobrescrever esses contadores. O retorno do job usa **`readSyncLogCounts`** para refletir o que está persistido (sucesso ou erro).

## Problema → mitigação

- **429 / muito tráfego** — pausa entre páginas; poucos dias em paralelo; não `Promise.all` em todos os dias.
- **Cap por dia** — `PJE_COMMUNICATION_LIMIT_PER_DAY` (predef. 2500) limita linhas persistidas por dia civil; mais pedidos HTTP (5 itens/página) mas volume previsível.
- **Muitas páginas** — até ~500 requisições/dia no teto (2500÷5); monitorizar `429` e `PJE_PAGE_DELAY_MS`.
- **Filtro mínimo na API** — sem `siglaTribunal`: `itensPorPagina=5` + paginação; **histórico:** sync por tribunal com `itensPorPagina=100`.
- **Next em Docker** — servidor precisa de `API_URL_INTERNAL` (ex. `http://backend:3001`); browser usa `NEXT_PUBLIC_API_URL`.
