import { z } from 'zod'

const env_schema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL deve ser uma URL válida'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET deve ter ao menos 8 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PJE_API_BASE_URL: z.string().url('PJE_API_BASE_URL deve ser uma URL válida'),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BACKEND_PORT: z.coerce.number().default(3001),
})

export type EnvConfig = z.infer<typeof env_schema>

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = env_schema.safeParse(config)

  if (!result.success) {
    const messages = result.error.errors
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n')
    throw new Error(`Variáveis de ambiente inválidas:\n${messages}`)
  }

  return result.data
}
