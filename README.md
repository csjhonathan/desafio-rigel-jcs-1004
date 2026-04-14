# rigel-jcs-1004

Monorepo fullstack para consulta de comunicações processuais do **Diário de Justiça Eletrônico Nacional** via [Comunica API do PJE](https://comunicaapi.pje.jus.br/swagger/index.html).

**Notas de backend (PJE, Docker, seed, etc.):** [notas.backend.md](./notas.backend.md).

## Deploy

**Frontend:** https://desafio-rigel-jcs-1004-frontend-production.up.railway.app

## CI/CD

- **Integração contínua (GitHub Actions):** em cada **push** para a branch **`main`**, o workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) instala dependências, corre **`npm test`** e **`npm run build`** no **backend** e **`npm run build`** no **frontend**. Falhas bloqueiam merge apenas se o repositório exigir checks verdes; de qualquer forma o histórico de runs fica em **Actions** no GitHub.
- **Entrega contínua (Railway):** o projeto está ligado ao repositório com **deploy automático** ao atualizar a `main` (serviços de backend e frontend no Railway). Variáveis sensíveis e URLs ficam nos painéis do Railway.
- **Logs em produção:** no backend, define `LOG_FORMAT=json` (ver `.env.example`) para uma **linha JSON por pedido HTTP** e por erro 5xx, mais fácil de filtrar nos logs do Railway ou noutro agregador.

## Proxy PJE (`pje-proxy/`)

A API do PJE bloqueia requisições vindas de IPs de datacenters (Railway, GitHub Actions, Cloudflare Workers). Como o ambiente local (IP residencial) não é bloqueado, o projeto inclui um **proxy reverso standalone** em `pje-proxy/` que deve rodar em um PC doméstico ligado continuamente.

O fluxo é:

```
Railway (backend) → ngrok URL → PC residencial (proxy) → PJE API
```

### Pré-requisitos

- **Node.js 18+** instalado no PC que vai rodar o proxy
- Conta gratuita no [ngrok](https://ngrok.com) com o token configurado

### Como rodar

```bash
# No PC residencial, dentro da pasta pje-proxy/
node index.js
# proxy sobe em http://localhost:3333
```

### Expor via ngrok

```bash
# Configure o token uma única vez
ngrok config add-authtoken SEU_TOKEN

# Use o domínio estático gratuito (1 por conta, não muda entre restarts)
ngrok http --hostname=SEU-DOMINIO.ngrok-free.app 3333
```

### Configurar no Railway

Defina a variável de ambiente do backend:

```
PJE_API_BASE_URL=https://SEU-DOMINIO.ngrok-free.app/api/v1
```

### Verificar

```bash
curl https://SEU-DOMINIO.ngrok-free.app/health
# {"status":"ok","target":"https://comunicaapi.pje.jus.br"}
```

---

## Início rápido

```bash
# 1. Clonar e configurar variáveis de ambiente
cp .env.example .env
# Editar .env: JWT_SECRET, etc. (GEMINI_API_KEY opcional para resumo IA)

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
| IA        | Google Gemini API (resumos)            |
| Deploy    | Docker Compose (local) + Railway (CD) + GitHub Actions (CI) |

## Decisoes tecnicas e arquiteturais

- **Frameworks (NestJS + Next.js):** escolha baseada em stack do dia a dia, com ganho de velocidade de implementacao e manutencao.
- **Organizacao do codigo:** monorepo com backend e frontend separados, backend em modulos do Nest (auth, communications, ai, jobs) e frontend com App Router + componentes reutilizaveis.
- **Railway para deploy:** adotado para aprender um novo servico e pela praticidade de hospedar backend, frontend e banco no mesmo ecossistema.
- **Paginacao/sincronizacao do PJE:** leitura por dia civil em BRT com limite por dia (`PJE_COMMUNICATION_LIMIT_PER_DAY`) para evitar explosao de volume e reduzir risco de rate limit. Detalhes e evolucao das tentativas estao em [`notas.backend.md`](./notas.backend.md).
- **Tratamento de erros e validacao:** DTOs com `class-validator`, variaveis de ambiente e parsing de respostas externas com Zod, filtro global de excecao no Nest e logs HTTP/5xx.
- **PJE proxy:** necessario porque chamadas vindas de datacenter (incluindo Railway e outras opcoes testadas) foram bloqueadas pela API do PJE; por isso foi adotado o proxy residencial via ngrok.
- **Resumo com IA (Google Gemini):** escolhido por simplicidade de integracao via REST, boa relacao custo/latencia para textos longos e facilidade de configuracao por variavel de ambiente (`GEMINI_API_KEY`), mantendo a chave apenas no backend.

## O que eu melhoraria com mais tempo

- Trocaria o polling da tela de logs por WebSocket para atualizacoes em tempo real com menor custo de requisicoes.
- Tentaria uma estrategia ainda mais eficiente de sincronizacao no PJE para reduzir o tempo total de seed e sync.
- Sanitizaria o conteudo HTML das comunicacoes antes de renderizar, ou usaria um viewer de rich text em modo somente leitura para melhor experiencia.

## Uso de IA no desenvolvimento

Usei IA em todo o ciclo para acelerar entrega com validacao manual:

- gerei e refinei regras de contexto (`CLAUDE.md` e `.cursorrules`) a partir dos requisitos;
- acelerei scaffold inicial e implementacoes repetitivas com agentes (Cursor e Claude), sempre revisando arquivo por arquivo;
- usei IA para iterar em estrategias de seed/sync, testes automatizados e parte da documentacao.

Tambem houve limitacoes, principalmente em fidelidade de UI e sensibilidade de produto, exigindo intervencao manual nas telas e estados.

Relato completo: [`notas.ai.md`](./notas.ai.md).

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
