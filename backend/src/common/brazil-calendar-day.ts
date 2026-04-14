/**
 * Converte `YYYY-MM-DD` em instante UTC do início desse dia civil em Brasília
 * (offset fixo -03:00; o Brasil não usa horário de verão desde 2019).
 *
 * Evita `new Date('YYYY-MM-DD')`, que o ECMAScript trata como meia-noite UTC e
 * inclui parte do dia anterior no fuso de Brasília.
 */
const BRT = '-03:00'
const BRAZIL_TZ = 'America/Sao_Paulo'

/** Data civil de hoje em Brasília (`YYYY-MM-DD`), para alinhar sync e PJE ao calendário local. */
export function brazilTodayYmd(at: Date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: BRAZIL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at)
}

export function brazilCivilDayStartUtc(ymd: string): Date {
  return new Date(`${ymd}T00:00:00${BRT}`)
}

/**
 * Converte `dataDisponibilizacao` da PJE em instante UTC alinhado aos filtros da API:
 * a data é o **dia civil no Brasil**; ignora hora se vier ISO (`2026-04-09T00:00:00Z`).
 */
export function pjeDisponibilizacaoToAvailableAtUtc(raw: string): Date {
  const trimmed = raw.trim()
  const ymd = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)?.[1]
  if (ymd) {
    return brazilCivilDayStartUtc(ymd)
  }
  const d = new Date(trimmed)
  if (Number.isNaN(d.getTime())) {
    throw new RangeError(`dataDisponibilizacao inválida: ${raw}`)
  }
  return d
}

/** Próximo dia civil (calendário gregoriano) a partir de `YYYY-MM-DD`. */
export function addCalendarDaysYmd(ymd: string, days: number): string {
  const parts = ymd.split('-').map(Number)
  const y = parts[0]
  const m = parts[1]
  const d = parts[2]
  if (parts.length !== 3 || !y || !m || !d) {
    throw new RangeError(`Data inválida (esperado YYYY-MM-DD): ${ymd}`)
  }
  const utc = Date.UTC(y, m - 1, d + days)
  const dt = new Date(utc)
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}
