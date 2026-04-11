# Notas de backend

Registo de impedimentos técnicos e decisões.

## Requisito funcional vs. volume na API

O desafio pedia comunicações dos **últimos 20 dias**, não **todas** as comunicações existentes nesse período. Por isso faz sentido **cortar por páginas por dia** (`PJE_SYNC_MAX_PAGES_PER_DAY`, ex. 10 páginas × 5 itens = 50 registros/dia): cumpre-se o recorte temporal e a existência de dados representativos, sem obrigar a ingestão completa do DJE (que esbarra em rate limit, tempo e limite documentado da API).

Se no futuro quiserem **mais volume**, basta subir esse teto — aceitando mais chamadas à PJE e maior risco de `429` (ajustar `PJE_PAGE_DELAY_MS` e concorrência de dias em conformidade).

## Componentes

| Peça | Notas |
|------|--------|
| `PjeApiClient` | Mesmo URL de consulta; `itensPorPagina=5`; `pagina` 1…N. **Cap:** `PJE_SYNC_MAX_PAGES_PER_DAY` (predef. 10 → 50 regs/dia). |
| Rate limit | `PJE_PAGE_DELAY_MS`; retentativa após 60s em `429`; cabeçalhos `x-ratelimit-*`. |
| `syncLastDays` | Lotes de dias: `PJE_SYNC_DAY_CONCURRENCY` (predef. 1, máx. 8). |
| Seed | Sync só se a base **não** tiver comunicações. Repovoar: `prisma migrate reset` ou lógica extra no `seed.ts`. |
| Docker seed | Não corre no `CMD` do backend (bloqueava HTTP → healthcheck falhava). Depois do `up`: `docker compose exec backend npm run seed`. |

## Problema → mitigação

- **429 / muito tráfego** — pausa entre páginas; poucos dias em paralelo; não `Promise.all` em todos os dias.
- **Cap por dia** — escolha de produto (requisito ≠ “tudo”); técnica + API aconselham não escalar páginas/dia sem monitorizar `429`.
- **Filtro mínimo na API** — sem `siglaTribunal`: usar `itensPorPagina=5` + paginação por dia.
- **Next em Docker** — servidor precisa de `API_URL_INTERNAL` (ex. `http://backend:3001`); browser usa `NEXT_PUBLIC_API_URL`.
