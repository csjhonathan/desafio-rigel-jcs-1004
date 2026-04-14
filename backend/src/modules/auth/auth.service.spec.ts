import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthService } from './auth.service'

describe('AuthService', () => {
  let service: AuthService
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock }
  }
  let jwt_sign: jest.Mock

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    }
    jwt_sign = jest.fn().mockReturnValue('access-token-jwt')

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jwt_sign } },
      ],
    }).compile()

    service = module.get(AuthService)
  })

  describe('register', () => {
    it('lança ConflictException se o e-mail já existir', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' })

      await expect(
        service.register({
          name: 'N',
          email: 'dup@example.com',
          password: '12345678',
        }),
      ).rejects.toThrow(ConflictException)

      expect(prisma.user.create).not.toHaveBeenCalled()
    })

    it('cria utilizador com senha hasheada e devolve token + user sem password', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({
        id: 'new-id',
        name: 'Demo',
        email: 'demo@example.com',
        created_at: new Date('2026-01-01T00:00:00.000Z'),
      })

      const result = await service.register({
        name: 'Demo',
        email: 'demo@example.com',
        password: '12345678',
      })

      expect(result.access_token).toBe('access-token-jwt')
      expect(result.user).toEqual({
        id: 'new-id',
        name: 'Demo',
        email: 'demo@example.com',
        created_at: new Date('2026-01-01T00:00:00.000Z'),
      })

      expect(jwt_sign).toHaveBeenCalledWith({
        sub: 'new-id',
        email: 'demo@example.com',
      })

      expect(prisma.user.create).toHaveBeenCalledTimes(1)
      const create_payload = prisma.user.create.mock.calls[0][0]
      expect(create_payload.data.email).toBe('demo@example.com')
      expect(create_payload.data.name).toBe('Demo')
      expect(create_payload.data.password).not.toBe('12345678')
      expect(await bcrypt.compare('12345678', create_payload.data.password)).toBe(true)
    })
  })

  describe('login', () => {
    it('lança UnauthorizedException se o utilizador não existir', async () => {
      prisma.user.findUnique.mockResolvedValue(null)

      await expect(
        service.login({ email: 'ghost@example.com', password: '12345678' }),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('lança UnauthorizedException se a senha estiver errada', async () => {
      const hash = await bcrypt.hash('senha_certa', 10)
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@a.com',
        name: 'A',
        password: hash,
        created_at: new Date(),
      })

      await expect(
        service.login({ email: 'a@a.com', password: 'outra_senha' }),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('devolve token e user quando as credenciais estão corretas', async () => {
      const hash = await bcrypt.hash('minhasenha8', 10)
      const created_at = new Date('2026-06-15T12:00:00.000Z')
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-42',
        email: 'ok@example.com',
        name: 'Ok User',
        password: hash,
        created_at,
      })

      const result = await service.login({
        email: 'ok@example.com',
        password: 'minhasenha8',
      })

      expect(result.access_token).toBe('access-token-jwt')
      expect(result.user).toEqual({
        id: 'user-42',
        name: 'Ok User',
        email: 'ok@example.com',
        created_at,
      })
      expect(jwt_sign).toHaveBeenCalledWith({
        sub: 'user-42',
        email: 'ok@example.com',
      })
    })
  })
})
