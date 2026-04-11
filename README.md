# rigel-jcs-1004

Monorepo fullstack para consulta de comunicações processuais do **Diário de Justiça Eletrônico Nacional** via [Comunica API do PJE](https://comunicaapi.pje.jus.br/swagger/index.html).

**Notas de backend (PJE, Docker, seed, etc.):** [notas.backend.md](./notas.backend.md).

## Início rápido

```bash
# 1. Clonar e configurar variáveis de ambiente
cp .env.example .env
# Editar .env: JWT_SECRET, etc. (ANTHROPIC_API_KEY opcional para resumo IA)

# 2. Subir o ambiente completo
docker compose up --build
```

Se a porta **5432** já estiver em uso no host (Postgres local), defina no `.env` por exemplo `POSTGRES_HOST_PORT=5433` e acesse o banco do container em `localhost:5433`.

O **seed não corre** na subida do container do backend: a sincronização com a PJE pode demorar muito e **bloquearia** o arranque — o healthcheck marcaria o serviço como unhealthy e o frontend não subiria. Depois de `docker compose up` (com backend saudável), popular a base:

```bash
docker compose exec backend npm run seed
```

Fora do Docker: `npm run seed --prefix backend`.

**Frontend:** http://localhost:3000  
**Backend / API:** http://localhost:3001/api/v1  
**Swagger:** http://localhost:3001/api/docs  
**Storybook:** `cd frontend && npm run storybook`

## Conta de demonstração

Após rodar o seed:
- **E-mail:** demo@rigel.com  
- **Senha:** demo1234

## Stack

| Camada    | Tecnologia                             |
|-----------|----------------------------------------|
| Backend   | NestJS + TypeScript + Prisma           |
| Frontend  | Next.js 14 (App Router) + Tailwind CSS |
| Banco     | PostgreSQL                             |
| Auth      | JWT via NextAuth + Passport            |
| IA        | Claude API (Anthropic)                 |
| Deploy    | Docker + Docker Compose                |

## Comandos úteis

```bash
# Backend
cd backend
npm run start:dev         # dev com hot-reload
npm run test              # testes unitários
npm run test:e2e          # testes de integração
npx prisma studio         # visualizar o banco

# Frontend
cd frontend
npm run dev               # dev server
npm run storybook         # Storybook
npm run test              # testes
```
