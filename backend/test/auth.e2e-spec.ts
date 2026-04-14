import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'
import { AuthController } from '../src/modules/auth/auth.controller'
import { AuthService } from '../src/modules/auth/auth.service'

describe('AuthController (e2e)', () => {
  let app: INestApplication

  const authServiceMock = {
    register: jest.fn().mockResolvedValue({
      access_token: 'token-register',
      user: { id: 'u1', name: 'Demo', email: 'demo@rigel.com' },
    }),
    login: jest.fn().mockResolvedValue({
      access_token: 'token-login',
      user: { id: 'u1', name: 'Demo', email: 'demo@rigel.com' },
    }),
  }

  beforeAll(async () => {
    const module_ref = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    }).compile()

    app = module_ref.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('POST /auth/register retorna token e usuário', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Demo', email: 'demo@rigel.com', password: '12345678' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.access_token).toBe('token-register')
        expect(body.user.email).toBe('demo@rigel.com')
      })

    expect(authServiceMock.register).toHaveBeenCalledTimes(1)
  })

  it('POST /auth/login retorna 200 com token', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'demo@rigel.com', password: '12345678' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.access_token).toBe('token-login')
      })

    expect(authServiceMock.login).toHaveBeenCalledTimes(1)
  })
})
