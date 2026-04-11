# CLAUDE.md — rigel-jcs-1004

## Visão Geral do Projeto

Monorepo fullstack que consome comunicações processuais do **Diário de Justiça Eletrônico Nacional** via [Comunica API do PJE](https://comunicaapi.pje.jus.br/swagger/index.html), persiste os dados em PostgreSQL e os apresenta em uma interface web com filtros, detalhamento e resumo por IA.

---

## Estrutura do Repositório

```
/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── strategies/
│   │   │   ├── communications/
│   │   │   │   ├── communications.module.ts
│   │   │   │   ├── communications.controller.ts
│   │   │   │   ├── communications.service.ts
│   │   │   │   └── communications.repository.ts
│   │   │   └── ai/
│   │   │       ├── ai.module.ts
│   │   │       └── ai.service.ts
│   │   ├── jobs/
│   │   │   └── sync.job.ts         # Cron diário às 01:00
│   │   ├── common/
│   │   │   ├── filters/
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   └── pipes/
│   │   ├── config/
│   │   │   └── env.validation.ts   # Validação das envs com Zod
│   │   └── main.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js App Router
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   └── (dashboard)/
│   │   │       ├── communications/
│   │   │       └── communications/[cnj_number]/
│   │   ├── components/
│   │   │   ├── atoms/              # Elementos básicos (Button, Input, Badge, ...)
│   │   │   ├── molecules/          # Combinações de atoms (SearchField, FilterBar, ...)
│   │   │   └── organisms/          # Blocos completos de UI (CommunicationTable, AISummaryModal, ...)
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── auth.ts
│   │   └── types/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Stack Técnica

| Camada           | Tecnologia                                        |
|------------------|---------------------------------------------------|
| Backend          | Node.js + TypeScript + **NestJS**                 |
| Frontend         | **Next.js 14+** (App Router) + TypeScript + **Tailwind CSS** |
| Componentes      | **Shadcn/ui** (usado apenas como base interna, nunca importado diretamente nas páginas) |
| Design System    | **Atomic Design** (atoms → molecules → organisms) |
| Documentação UI  | **Storybook**                                     |
| Banco de dados   | PostgreSQL                                        |
| ORM              | **Prisma**                                        |
| Autenticação     | JWT via `@nestjs/jwt` + Passport                  |
| Containerização  | Docker + Docker Compose                           |
| Agendamento      | `@nestjs/schedule`                                |
| IA (resumos)     | Claude API (Anthropic) ou OpenAI                  |
| Validação        | **Zod** (envs + parsing de respostas externas)    |

---

## Convenções de Nomenclatura

Estas regras são **obrigatórias** em todo o código do projeto.

### Idioma
- **Instruções, comentários e documentação:** português
- **Todo código** (variáveis, métodos, classes, tipos, entidades, nomes de arquivo): **inglês**

### Variáveis e propriedades → `snake_case`

```ts
// ✅ correto
const process_number = '1234567-89.2024.1.00.0000'
const { created_at, tribunal_name } = communication

// ❌ errado
const processNumber = '...'
const { createdAt, tribunalName } = communication
```

### Funções e métodos → `camelCase`

```ts
// ✅ correto
async function fetchCommunications() { ... }

class CommunicationsService {
  async findByProcessNumber(process_number: string) { ... }
}

// ❌ errado
async function fetch_communications() { ... }
```

### Classes, interfaces, types e enums → `PascalCase`

```ts
// ✅ correto
class CommunicationsService { ... }
interface CreateUserDto { ... }
type PaginatedResponse<T> = { ... }
enum CommunicationType { ... }
```

### Arquivos e pastas → `kebab-case`

```
communications.service.ts
sync-communications.job.ts
use-communications.ts
ai-summary-modal.tsx
```

### Constantes de módulo → `SCREAMING_SNAKE_CASE`

```ts
const MAX_PAGE_SIZE = 100
const CRON_DAILY_SYNC = '0 1 * * *'
```

### Campos do Prisma → `snake_case`

```prisma
model Communication {
  id             String   @id @default(uuid())
  external_id    String   @unique
  process_number String
  created_at     DateTime @default(now())
}
```

---

## Backend — Padrões NestJS

### Responsabilidade de cada camada
- **Controller** — recebe a requisição HTTP, valida o input via DTO + Pipe, delega ao service e retorna a resposta. Sem lógica de negócio aqui.
- **Service** — orquestra a lógica de negócio, chama o repository ou APIs externas.
- **Repository** — todas as chamadas ao Prisma ficam aqui. O service nunca acessa `prisma` diretamente.

```ts
// ✅ correto
@Injectable()
export class CommunicationsService {
  constructor(private readonly communicationsRepository: CommunicationsRepository) {}

  async findAll(filters: FilterCommunicationsDto) {
    return this.communicationsRepository.findAll(filters)
  }
}
```

### DTOs e validação
Use `class-validator` para DTOs de requisição e **Zod** para validar variáveis de ambiente e respostas da API do PJE.

```ts
export class FilterCommunicationsDto {
  @IsOptional()
  @IsDateString()
  start_date?: string

  @IsOptional()
  @IsString()
  tribunal?: string
}
```

### Tratamento de erros
Use as exceções nativas do NestJS. Nunca lance erros genéricos a partir dos controllers.

```ts
throw new NotFoundException(`Communication ${id} not found`)
throw new UnauthorizedException('Invalid credentials')
```

### Autenticação
O `JwtAuthGuard` deve ser aplicado **globalmente** via `APP_GUARD`. Rotas públicas são marcadas com o decorator `@Public()`.

### Cron job
Definido em `src/jobs/sync-communications.job.ts` com `@nestjs/schedule`.

```ts
@Cron('0 1 * * *', { name: 'daily_sync' })
async handleDailySync() { ... }
```

---

## Frontend — Padrões Next.js + Tailwind

### App Router
- Grupos de rota: `(auth)` para páginas públicas, `(dashboard)` para páginas protegidas
- Cada pasta de rota tem `page.tsx` e opcionalmente `loading.tsx` e `error.tsx`
- Componentes são **Server Components por padrão** — adicione `'use client'` apenas quando necessário (event handlers, hooks, APIs do browser)

### Estilização
Use **exclusivamente classes utilitárias do Tailwind**. Sem inline styles, sem CSS Modules, sem styled-components.

```tsx
// ✅ correto
<button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
  Enviar
</button>

// ❌ errado
<button style={{ backgroundColor: 'blue' }}>Enviar</button>
```

### Design System — Atomic Design

A estrutura de componentes segue o padrão **Atomic Design** com três níveis:

- **atoms/** — elementos indivisíveis de UI: `Button`, `Input`, `Badge`, `Spinner`, `Label`
- **molecules/** — composições de atoms com propósito claro: `SearchField`, `FilterBar`, `FormField`, `Pagination`
- **organisms/** — blocos completos de interface: `CommunicationTable`, `CommunicationCard`, `AISummaryModal`

As páginas (`app/**/page.tsx`) apenas importam organisms. Organisms importam molecules. Molecules importam atoms.

### Shadcn/ui — regra de uso

O Shadcn/ui é usado como **implementação interna dos atoms**, nunca importado diretamente nas páginas ou organisms. Isso garante que uma troca de lib no futuro impacte apenas a camada de atoms.

```tsx
// ✅ correto — página importa organism
import { CommunicationTable } from '@/components/organisms/communication-table'

// ✅ correto — atom encapsula o Shadcn
// components/atoms/button.tsx
import { Button as ShadcnButton } from '@/components/ui/button'

export function Button(props: ButtonProps) {
  return <ShadcnButton {...props} />
}

// ❌ errado — Shadcn importado diretamente na página ou organism
import { Button } from '@/components/ui/button'
```

### Storybook

Todo componente criado em `atoms/`, `molecules/` e `organisms/` deve ter um arquivo `.stories.tsx` correspondente.

```
components/
├── atoms/
│   ├── button.tsx
│   └── button.stories.tsx
├── molecules/
│   ├── search-field.tsx
│   └── search-field.stories.tsx
└── organisms/
    ├── communication-table.tsx
    └── communication-table.stories.tsx
```

Cada story deve cobrir os estados principais do componente (default, loading, empty, error, variantes visuais).

### Estados obrigatórios em todo componente que busca dados
Todo componente que faz requisição deve tratar **loading**, **empty** e **error** — mesmo os estados não mostrados explicitamente no Figma serão avaliados.

---

## Modelo de Dados (Prisma — referência)

```prisma
model User {
  id         String   @id @default(uuid())
  name       String
  email      String   @unique
  password   String   // hash bcrypt, mínimo 10 salt rounds
  created_at DateTime @default(now())
}

model Communication {
  id               String      @id @default(uuid())
  external_id      String      @unique   // ID único da API do PJE
  process_number   String                // formato CNJ
  tribunal         String
  available_at     DateTime
  kind             String
  content          String?     @db.Text
  has_res_judicata Boolean     @default(false) // "transitou em julgado"
  ai_summary       String?     @db.Text
  recipients       Recipient[]
  created_at       DateTime    @default(now())
}

model Recipient {
  id               String        @id @default(uuid())
  name             String
  kind             String        // "lawyer", "party", etc.
  communication_id String
  communication    Communication @relation(fields: [communication_id], references: [id])
}

model SyncLog {
  id             String   @id @default(uuid())
  executed_at    DateTime @default(now())
  success        Boolean
  total_synced   Int      @default(0)
  error_message  String?
}
```

---

## Regras de Negócio

1. **Sem duplicidade** — ao sincronizar comunicações (cron ou seed), usar `upsert` do Prisma com chave em `external_id`. Nunca inserir o mesmo registro duas vezes.

2. **Cron diário às 01:00** — busca as comunicações do dia anterior e salva no banco. Registra resultado em `SyncLog` (sucesso, quantidade, erro se houver).

3. **Detecção de "transitou em julgado"** — ao salvar uma comunicação, verificar se `content` contém o termo (case-insensitive) e setar `has_res_judicata = true`. Na tela de detalhes, exibir badge visual e destacar o trecho.

4. **Resumo por IA** — acionado pelo usuário via botão + modal na tela de detalhes. O backend envia o `content` para a IA e retorna o resumo. **A chave da API de IA nunca é exposta ao frontend.**

5. **Seed inicial** — popular o banco com os últimos 20 dias de comunicações na primeira execução via `npm run seed`.

6. **O frontend nunca chama a API do PJE diretamente** — todos os dados vêm do backend próprio.

---

## Autenticação

- Rotas públicas: `POST /auth/register`, `POST /auth/login`
- Demais rotas exigem `Authorization: Bearer <token>`
- Senha armazenada com `bcrypt`, mínimo 10 salt rounds
- Payload JWT: `{ sub: user_id, email: string }`
- Expiração configurável via `JWT_EXPIRES_IN`

---

## Variáveis de Ambiente

```env
# Banco de dados
DATABASE_URL=postgresql://postgres:postgres@db:5432/rigel-jcs-1004

# JWT
JWT_SECRET=troque_em_producao
JWT_EXPIRES_IN=7d

# API do PJE
PJE_API_BASE_URL=https://comunicaapi.pje.jus.br/api/v1

# IA
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# App
NODE_ENV=development
BACKEND_PORT=3001
FRONTEND_PORT=3000
```

Todas as variáveis de ambiente devem ser validadas na inicialização da aplicação com um schema Zod em `src/config/env.validation.ts`. A aplicação deve falhar imediatamente com mensagem descritiva se alguma variável obrigatória estiver ausente.

---

## Comandos Essenciais

```bash
# Subir o ambiente completo
cp .env.example .env
docker-compose up --build

# Seed dos últimos 20 dias
npm run seed --prefix backend

# Prisma
npx prisma migrate dev --name <nome_da_migration>  # nova migration
npx prisma migrate deploy                            # aplicar em produção
npx prisma studio                                    # visualizar o banco

# Testes
cd backend && npm run test        # unitários
cd backend && npm run test:e2e    # integração
cd frontend && npm run test
```

---

## Rotas do Frontend

| Rota                                | Descrição                               | Auth |
|-------------------------------------|-----------------------------------------|------|
| `/login`                            | Tela de login                           | Não  |
| `/register`                         | Tela de cadastro                        | Não  |
| `/communications`                   | Listagem com filtros e paginação        | Sim  |
| `/communications/[cnj_number]`      | Detalhes do processo + modal de IA      | Sim  |

### Filtros disponíveis na listagem
- Período (`start_date` / `end_date`)
- Tribunal de origem
- Número do processo (formato CNJ)

### Campos mínimos por linha
`process_number` · `tribunal` · `available_at` · `kind` · `recipients` · `content`