import { ArgumentsHost, HttpException, Logger, NotFoundException } from '@nestjs/common'
import { AllExceptionsFilter } from './http-exception.filter'

function create_host(url = '/test') {
  const json = jest.fn()
  const status = jest.fn().mockReturnValue({ json })
  const response = { status, json }
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ method: 'GET', url }),
    }),
  } as unknown as ArgumentsHost
  return { host, response }
}

describe('AllExceptionsFilter', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('responde JSON com statusCode para HttpException', () => {
    const filter = new AllExceptionsFilter()
    const { host, response } = create_host()

    filter.catch(new NotFoundException('não encontrado'), host)

    expect(response.status).toHaveBeenCalledWith(404)
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        path: '/test',
        message: expect.anything(),
      }),
    )
  })

  it('usa 500 para erro não HTTP', () => {
    const filter = new AllExceptionsFilter()
    const { host, response } = create_host()

    filter.catch(new Error('boom'), host)

    expect(response.status).toHaveBeenCalledWith(500)
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Erro interno no servidor',
      }),
    )
  })

  it('aceita HttpException genérica', () => {
    const filter = new AllExceptionsFilter()
    const { host, response } = create_host()

    filter.catch(new HttpException('bad', 400), host)
    expect(response.status).toHaveBeenCalledWith(400)
  })
})
