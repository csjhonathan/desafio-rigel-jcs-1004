import { PrismaService } from '../../prisma/prisma.service'
import { CommunicationsRepository } from './communications.repository'

describe('CommunicationsRepository', () => {
  let repository: CommunicationsRepository
  let findMany: jest.Mock
  let count: jest.Mock
  let prisma: PrismaService

  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue([])
    count = jest.fn().mockResolvedValue(0)
    prisma = {
      communication: {
        findMany,
        count,
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((promises: Promise<unknown>[]) => Promise.all(promises)),
    } as unknown as PrismaService

    repository = new CommunicationsRepository(prisma)
  })

  it('findAll aplica intervalo de available_at em dia civil BRT (gte + lt exclusivo)', async () => {
    await repository.findAll({
      start_date: '2026-04-09',
      end_date: '2026-04-09',
      page: '1',
      limit: '20',
    })

    expect(findMany).toHaveBeenCalled()
    const args = findMany.mock.calls[0][0]
    expect(args.where.available_at.gte.toISOString()).toBe('2026-04-09T03:00:00.000Z')
    expect(args.where.available_at.lt.toISOString()).toBe('2026-04-10T03:00:00.000Z')
    expect(args.orderBy).toEqual([{ available_at: 'desc' }, { id: 'desc' }])
  })

  it('findAll aplica filtro insensível a maiúsculas em tribunal e process_number', async () => {
    await repository.findAll({
      tribunal: 'TJSP',
      process_number: '0001',
    })

    const args = findMany.mock.calls[0][0]
    expect(args.where.tribunal).toEqual({ contains: 'TJSP', mode: 'insensitive' })
    expect(args.where.process_number).toEqual({ contains: '0001', mode: 'insensitive' })
  })

  it('findAll limita page size ao máximo', async () => {
    await repository.findAll({ limit: '500' })

    const args = findMany.mock.calls[0][0]
    expect(args.take).toBe(100)
  })

  it('findByProcessNumber ordena por available_at e id', async () => {
    const find_many_process = jest.fn().mockResolvedValue([])
    const prisma = {
      communication: {
        findMany: find_many_process,
        count: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as PrismaService

    const repo = new CommunicationsRepository(prisma)
    await repo.findByProcessNumber('0000000-00.0000.0.00.0000')

    expect(find_many_process).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { process_number: '0000000-00.0000.0.00.0000' },
        orderBy: [{ available_at: 'desc' }, { id: 'desc' }],
      }),
    )
  })

  it('listUniqueTribunals busca valores únicos e ordenados', async () => {
    findMany.mockResolvedValue([{ tribunal: 'STJ' }, { tribunal: 'TJSP' }])

    await expect(repository.listUniqueTribunals()).resolves.toEqual(['STJ', 'TJSP'])

    expect(prisma.communication.findMany).toHaveBeenCalledWith({
      select: { tribunal: true },
      where: { tribunal: { not: '' } },
      distinct: ['tribunal'],
      orderBy: { tribunal: 'asc' },
    })
  })
})
