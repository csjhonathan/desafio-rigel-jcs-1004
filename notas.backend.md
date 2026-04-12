# Notas de backend

Registo de impedimentos técnicos e decisões.

## Requisito funcional vs. volume na API

O desafio pedia comunicações dos **últimos 20 dias**, não **todas** as comunicações existentes nesse período. Por isso faz sentido **cortar por páginas por dia** (`PJE_SYNC_MAX_PAGES_PER_DAY`, ex. 10 páginas × 5 itens = 50 registros/dia): cumpre-se o recorte temporal e a existência de dados representativos, sem obrigar a ingestão completa do DJE (que esbarra em rate limit, tempo e limite documentado da API).

Se no futuro quiserem **mais volume**, basta subir esse teto — aceitando mais chamadas à PJE e maior risco de `429` (ajustar `PJE_PAGE_DELAY_MS` e concorrência de dias em conformidade).

## Filtro `start_date` / `end_date` (comunicações)

**Problema:** Com `new Date('YYYY-MM-DD')`, o motor trata a data como **meia-noite UTC**. Em Brasília isso cai no **fim da noite do dia anterior** (ex.: `2026-04-09` → `2026-04-09T00:00:00.000Z` = 08/04 21:00 BRT). O `gte` desse valor incluía registros ainda “do dia 08” na UI.

**Solução:** Interpretar `YYYY-MM-DD` como **dia civil em Brasília** (`T00:00:00-03:00`, offset fixo; sem horário de verão no Brasil desde 2019). Limite superior com **`lt` no início do dia seguinte** em BRT (intervalo meio-aberto), em vez de `lte` na mesma meia-noite UTC. DTO restringe o formato a `YYYY-MM-DD` para alinhar com esse contrato. Ver `brazil-calendar-day.ts` e `CommunicationsRepository.findAll`.

## Componentes

| Peça | Notas |
|------|--------|
| `PjeApiClient` | Mesmo URL; `itensPorPagina=5`. **Seed:** cap `PJE_SYNC_MAX_PAGES_PER_DAY` ou `max_pages`. **Cron:** `all_pages` → pagina até esgotar (teto segurança 20 000 pág. no código). |
| Cron `syncForYesterday` | Só ontem; chama `fetchCommunications(..., { all_pages: true })` — **não** lê `PJE_SYNC_MAX_PAGES_PER_DAY`. |
| `syncForDate` / `syncLastDays` | Seed: cap do **seed** (`PJE_SYNC_MAX_PAGES_PER_DAY`). |
| Rate limit | `PJE_PAGE_DELAY_MS`; retentativa após 60s em `429`; cabeçalhos `x-ratelimit-*`. |
| `syncLastDays` | Dias civis em **BRT** (`brazilTodayYmd` + `addCalendarDaysYmd`); **não inclui hoje**. Lotes: `PJE_SYNC_DAY_CONCURRENCY` (predef. 1, máx. 8). |
| Seed | Sync só se a base **não** tiver comunicações. Repovoar: `prisma migrate reset` ou lógica extra no `seed.ts`. |
| Docker seed | Não corre no `CMD` do backend (bloqueava HTTP → healthcheck falhava). Depois do `up`: `docker compose exec backend npm run seed`. |

## Problema → mitigação

- **429 / muito tráfego** — pausa entre páginas; poucos dias em paralelo; não `Promise.all` em todos os dias.
- **Cap por dia** — escolha de produto (requisito ≠ “tudo”); técnica + API aconselham não escalar páginas/dia sem monitorizar `429`.
- **Filtro mínimo na API** — sem `siglaTribunal`: usar `itensPorPagina=5` + paginação por dia.
- **Next em Docker** — servidor precisa de `API_URL_INTERNAL` (ex. `http://backend:3001`); browser usa `NEXT_PUBLIC_API_URL`.
