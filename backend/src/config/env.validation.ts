import { z } from 'zod'

const env_schema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL deve ser uma URL válida'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET deve ter ao menos 8 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PJE_API_BASE_URL: z.string().url('PJE_API_BASE_URL deve ser uma URL válida'),
  /** Máximo de comunicações a ingerir por dia civil (BRT) por sync; predef. 2500. */
  PJE_COMMUNICATION_LIMIT_PER_DAY: z.coerce.number().int().min(1).max(1_000_000).default(2500),
  PJE_PAGE_DELAY_MS: z.preprocess((v) => {
    if (v === '' || v == null) return undefined
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }, z.number().min(50).max(30_000).optional()),
  /** Quantos dias a sincronizar em paralelo no syncLastDays (1–8). Predefinido 1. */
  PJE_SYNC_DAY_CONCURRENCY: z.preprocess((v) => {
    if (v === '' || v == null) return undefined
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }, z.number().int().min(1).max(8).optional()),
  /** Chave em https://aistudio.google.com/apikey — resumos via Gemini (REST). */
  GEMINI_API_KEY: z.string().optional(),
  /** Modelo :generateContent (ex. gemini-flash-latest). */
  GEMINI_MODEL: z.string().optional().default('gemini-flash-latest'),
  /** Caracteres máx. do texto enviados ao Gemini (reduz TPM no free tier). Predef. 12000. */
  GEMINI_MAX_INPUT_CHARS: z.coerce.number().int().min(2_000).max(500_000).default(12_000),
  /**
   * `json`: uma linha JSON por log (HTTP e erros 5xx), ideal para produção / agregadores.
   * `pretty`: Nest Logger legível (predefinido em desenvolvimento).
   */
  LOG_FORMAT: z.enum(['json', 'pretty']).default('pretty'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BACKEND_PORT: z.coerce.number().default(3001),
  PJE_LAST_DAYS_TO_SYNC: z.coerce.number().default(20),
})

export type EnvConfig = z.infer<typeof env_schema>

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = env_schema.safeParse(config)

  if (!result.success) {
    const messages = result.error.issues
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n')
    throw new Error(`Variáveis de ambiente inválidas:\n${messages}`)
  }

  return result.data
}
