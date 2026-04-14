import { plainToInstance } from 'class-transformer'
import { validateSync } from 'class-validator'
import { RegisterDto } from './register.dto'

function validate(plain: object) {
  return validateSync(plainToInstance(RegisterDto, plain), { forbidUnknownValues: false })
}

describe('RegisterDto', () => {
  it('aceita nome, e-mail e senha com pelo menos 8 caracteres', () => {
    expect(
      validate({
        name: 'Fulano',
        email: 'fulano@example.com',
        password: '12345678',
      }),
    ).toHaveLength(0)
  })

  it('rejeita senha com menos de 8 caracteres', () => {
    const errors = validate({
      name: 'Fulano',
      email: 'fulano@example.com',
      password: '1234567',
    })
    expect(errors.some((e) => e.property === 'password')).toBe(true)
  })

  it('rejeita e-mail inválido', () => {
    const errors = validate({
      name: 'Fulano',
      email: 'invalid',
      password: '12345678',
    })
    expect(errors.some((e) => e.property === 'email')).toBe(true)
  })

  it('rejeita name ausente ou não string', () => {
    expect(validate({ email: 'a@b.com', password: '12345678' } as object).length).toBeGreaterThan(0)
    expect(
      validate({ name: 123, email: 'a@b.com', password: '12345678' } as unknown as object).length,
    ).toBeGreaterThan(0)
  })
})
