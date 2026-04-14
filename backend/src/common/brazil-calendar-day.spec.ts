import {
  addCalendarDaysYmd,
  brazilCivilDayStartUtc,
  brazilTodayYmd,
  pjeDisponibilizacaoToAvailableAtUtc,
} from './brazil-calendar-day'

describe('brazilCivilDayStartUtc', () => {
  it('mapeia o dia civil em BRT para o instante UTC correto (UTC-3)', () => {
    expect(brazilCivilDayStartUtc('2026-04-09').toISOString()).toBe('2026-04-09T03:00:00.000Z')
  })
})

describe('pjeDisponibilizacaoToAvailableAtUtc', () => {
  it('interpreta só a data YYYY-MM-DD como dia civil BR (igual ao filtro da API)', () => {
    expect(pjeDisponibilizacaoToAvailableAtUtc('2026-04-09').toISOString()).toBe(
      '2026-04-09T03:00:00.000Z',
    )
  })

  it('extrai YYYY-MM-DD do início mesmo com timestamp ISO', () => {
    expect(pjeDisponibilizacaoToAvailableAtUtc('2026-04-09T00:00:00.000Z').toISOString()).toBe(
      '2026-04-09T03:00:00.000Z',
    )
  })

  it('ignora hora após a data (prefixo YYYY-MM-DD)', () => {
    expect(pjeDisponibilizacaoToAvailableAtUtc('2026-04-09T15:30:45.000Z').toISOString()).toBe(
      '2026-04-09T03:00:00.000Z',
    )
  })

  it('aceita trim em volta da string', () => {
    expect(pjeDisponibilizacaoToAvailableAtUtc('  2026-01-02  ').toISOString()).toBe(
      '2026-01-02T03:00:00.000Z',
    )
  })

  it('lança RangeError para string vazia', () => {
    expect(() => pjeDisponibilizacaoToAvailableAtUtc('')).toThrow(RangeError)
  })

  it('fallback: string sem prefixo YYYY-MM-DD usa Date.parse', () => {
    const d = pjeDisponibilizacaoToAvailableAtUtc('Thu, 09 Apr 2026 03:00:00 GMT')
    expect(d.toISOString()).toBe('2026-04-09T03:00:00.000Z')
  })
})

describe('brazilTodayYmd', () => {
  it('retorna o dia civil em America/Sao_Paulo para um instante UTC', () => {
    expect(brazilTodayYmd(new Date('2026-04-13T02:00:00.000Z'))).toBe('2026-04-12')
    expect(brazilTodayYmd(new Date('2026-04-13T12:00:00.000Z'))).toBe('2026-04-13')
  })
})

describe('addCalendarDaysYmd', () => {
  it('soma dias no calendário gregoriano (UTC)', () => {
    expect(addCalendarDaysYmd('2026-01-01', 1)).toBe('2026-01-02')
    expect(addCalendarDaysYmd('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('aceita valores negativos', () => {
    expect(addCalendarDaysYmd('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('lança para formato inválido', () => {
    expect(() => addCalendarDaysYmd('2026-13', 1)).toThrow(RangeError)
    expect(() => addCalendarDaysYmd('', 1)).toThrow(RangeError)
  })
})
