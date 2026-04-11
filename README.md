# rigel-jcs-1004

Monorepo fullstack para consulta de comunicações processuais do **Diário de Justiça Eletrônico Nacional** via [Comunica API do PJE](https://comunicaapi.pje.jus.br/swagger/index.html).

## Início rápido

```bash
# 1. Clonar e configurar variáveis de ambiente
cp .env.example .env
# Editar .env: adicionar JWT_SECRET, ANTHROPIC_API_KEY (opcional)

# 2. Subir o ambiente completo
docker-compose up --build

# 3. Rodar o seed (últimos 20 dias de comunicações)
npm run seed --prefix backend
```

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
