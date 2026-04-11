# Notas de backend — API PJE (Comunica)

Registo de impedimentos técnicos e decisões. *(Uso de IA: documentar na entrega do desafio — implementação, Docker, alinhamento ao swagger.)*

## Componentes

| Peça | Notas |
|------|--------|
| `PjeApiClient` | `GET …/comunicacao`; `dataDisponibilizacaoInicio/Fim`; `itensPorPagina=5`; `pagina`. |
| Rate limit | `PJE_PAGE_DELAY_MS`; retentativa após 60s em `429`; cabeçalhos `x-ratelimit-*`. |
| `syncLastDays` | Lotes de dias: `PJE_SYNC_DAY_CONCURRENCY` (predef. 1, máx. 8). |
| Seed | Sync só se a base **não** tiver comunicações. Repovoar: `prisma migrate reset` ou lógica extra no `seed.ts`. |
| Docker seed | Não corre no `CMD` do backend (bloqueava HTTP → healthcheck falhava). Depois do `up`: `docker compose exec backend npm run seed`. |

## Problema → mitigação

- **429 / muito tráfego** — pausa entre páginas; poucos dias em paralelo; não `Promise.all` em todos os dias.
- **count ≥ 10 000** — limite documentado da API para alguns perfis; aviso em log; possível truncagem.
- **Filtro mínimo na API** — sem `siglaTribunal`: usar `itensPorPagina=5` + paginação por dia.
- **Next em Docker** — servidor precisa de `API_URL_INTERNAL` (ex. `http://backend:3001`); browser usa `NEXT_PUBLIC_API_URL`.
