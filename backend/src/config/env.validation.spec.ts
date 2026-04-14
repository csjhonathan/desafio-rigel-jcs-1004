import { validateEnv } from './env.validation'

const minimal_valid = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/rigel',
  JWT_SECRET: '12345678',
  PJE_API_BASE_URL: 'https://comunicaapi.pje.jus.br/api/v1',
}

describe('validateEnv', () => {
  it('aceita variáveis mínimas e aplica predefinições', () => {
    const env = validateEnv(minimal_valid)
    expect(env.JWT_EXPIRES_IN).toBe('7d')
    expect(env.NODE_ENV).toBe('development')
    expect(env.BACKEND_PORT).toBe(3001)
    expect(env.PJE_COMMUNICATION_LIMIT_PER_DAY).toBe(2500)
    expect(env.GEMINI_MODEL).toBe('gemini-flash-latest')
    expect(env.GEMINI_MAX_INPUT_CHARS).toBe(12_000)
    expect(env.PJE_LAST_DAYS_TO_SYNC).toBe(20)
  })

  it('coage números a partir de string', () => {
    const env = validateEnv({
      ...minimal_valid,
      BACKEND_PORT: '3002',
      PJE_COMMUNICATION_LIMIT_PER_DAY: '100',
    })
    expect(env.BACKEND_PORT).toBe(3002)
    expect(env.PJE_COMMUNICATION_LIMIT_PER_DAY).toBe(100)
  })

  it('rejeita DATABASE_URL inválida', () => {
    expect(() =>
      validateEnv({ ...minimal_valid, DATABASE_URL: 'não-é-url' }),
    ).toThrow(/Variáveis de ambiente inválidas/)
  })

  it('rejeita JWT_SECRET curto', () => {
    expect(() => validateEnv({ ...minimal_valid, JWT_SECRET: 'curta' })).toThrow(
      /Variáveis de ambiente inválidas/,
    )
  })

  it('rejeita PJE_COMMUNICATION_LIMIT_PER_DAY fora do intervalo', () => {
    expect(() =>
      validateEnv({ ...minimal_valid, PJE_COMMUNICATION_LIMIT_PER_DAY: 0 }),
    ).toThrow(/Variáveis de ambiente inválidas/)
  })

  it('aceita GEMINI_API_KEY ausente', () => {
    const env = validateEnv(minimal_valid)
    expect(env.GEMINI_API_KEY).toBeUndefined()
  })
})
