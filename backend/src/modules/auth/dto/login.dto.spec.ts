import { plainToInstance } from 'class-transformer'
import { validateSync } from 'class-validator'
import { LoginDto } from './login.dto'

function validate(plain: object) {
  return validateSync(plainToInstance(LoginDto, plain), { forbidUnknownValues: false })
}

describe('LoginDto', () => {
  it('aceita e-mail e senha válidos', () => {
    expect(validate({ email: 'user@example.com', password: 'secret' })).toHaveLength(0)
  })

  it('rejeita e-mail inválido', () => {
    expect(validate({ email: 'não-é-email', password: 'x' }).length).toBeGreaterThan(0)
  })

  it('rejeita password não string (tipo errado)', () => {
    const errors = validate({ email: 'a@b.com', password: 123 } as unknown as object)
    expect(errors.length).toBeGreaterThan(0)
  })
})
