import { plainToInstance } from 'class-transformer'
import { validateSync } from 'class-validator'
import { FilterCommunicationsDto } from './filter-communications.dto'

function validateDto(plain: object) {
  const dto = plainToInstance(FilterCommunicationsDto, plain)
  return validateSync(dto, { forbidUnknownValues: false })
}

describe('FilterCommunicationsDto', () => {
  it('aceita objeto vazio (todos opcionais)', () => {
    expect(validateDto({})).toHaveLength(0)
  })

  it('aceita start_date e end_date em YYYY-MM-DD', () => {
    expect(
      validateDto({
        start_date: '2026-04-01',
        end_date: '2026-04-30',
      }),
    ).toHaveLength(0)
  })

  it('rejeita start_date com formato errado', () => {
    const errors = validateDto({ start_date: '01-04-2026' })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rejeita end_date que não casa com YMD', () => {
    const errors = validateDto({ end_date: '2026/04/01' })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('aceita page e limit como string numérica', () => {
    expect(validateDto({ page: '2', limit: '10' })).toHaveLength(0)
  })

  it('rejeita page não numérico', () => {
    const errors = validateDto({ page: 'abc' })
    expect(errors.length).toBeGreaterThan(0)
  })
})
