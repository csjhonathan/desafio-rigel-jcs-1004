import { NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AiService } from '../ai/ai.service'
import { CommunicationsRepository } from './communications.repository'
import { CommunicationsService, detectResJudicata } from './communications.service'

describe('detectResJudicata', () => {
  it('retorna false para vazio ou null', () => {
    expect(detectResJudicata(undefined)).toBe(false)
    expect(detectResJudicata(null)).toBe(false)
    expect(detectResJudicata('')).toBe(false)
  })

  it('detecta transitou em julgado (case insensitive)', () => {
    expect(detectResJudicata('Processo transitou em julgado.')).toBe(true)
    expect(detectResJudicata('TRANSITADA EM JULGADO')).toBe(true)
  })

  it('não dispara em texto irrelevante', () => {
    expect(detectResJudicata('Intimação para manifestação.')).toBe(false)
  })
})

describe('CommunicationsService', () => {
  let service: CommunicationsService
  let repository: {
    findAll: jest.Mock
    findById: jest.Mock
    findByProcessNumber: jest.Mock
    listUniqueTribunals: jest.Mock
    updateAiSummary: jest.Mock
  }
  let ai_service: { summarize: jest.Mock }

  beforeEach(async () => {
    repository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByProcessNumber: jest.fn(),
      listUniqueTribunals: jest.fn(),
      updateAiSummary: jest.fn(),
    }
    ai_service = { summarize: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunicationsService,
        { provide: CommunicationsRepository, useValue: repository },
        { provide: AiService, useValue: ai_service },
      ],
    }).compile()

    service = module.get(CommunicationsService)
  })

  it('findAll delega ao repositório', async () => {
    const payload = { data: [], meta: { total: 0, page: 1, limit: 20, total_pages: 0 } }
    repository.findAll.mockResolvedValue(payload)

    await expect(service.findAll({})).resolves.toEqual(payload)
    expect(repository.findAll).toHaveBeenCalledWith({})
  })

  it('findById lança NotFound quando não existe', async () => {
    repository.findById.mockResolvedValue(null)

    await expect(service.findById('uuid-1')).rejects.toThrow(NotFoundException)
  })

  it('listUniqueTribunals delega ao repositório', async () => {
    const payload = ['STJ', 'TJSP']
    repository.listUniqueTribunals.mockResolvedValue(payload)

    await expect(service.listUniqueTribunals()).resolves.toEqual(payload)
    expect(repository.listUniqueTribunals).toHaveBeenCalledTimes(1)
  })

  it('findById retorna comunicação quando existe', async () => {
    const row = { id: 'uuid-1', content: 'x' }
    repository.findById.mockResolvedValue(row)

    await expect(service.findById('uuid-1')).resolves.toEqual(row)
  })

  it('generateAiSummary devolve resumo existente sem chamar IA', async () => {
    repository.findById.mockResolvedValue({
      id: '1',
      ai_summary: 'já salvo',
      content: 'longo',
    })

    await expect(service.generateAiSummary('1')).resolves.toEqual({ ai_summary: 'já salvo' })
    expect(ai_service.summarize).not.toHaveBeenCalled()
    expect(repository.updateAiSummary).not.toHaveBeenCalled()
  })

  it('generateAiSummary gera, persiste e devolve novo resumo', async () => {
    repository.findById.mockResolvedValue({
      id: '1',
      ai_summary: null,
      content: 'texto da comunicação',
    })
    ai_service.summarize.mockResolvedValue('resumo novo')
    repository.updateAiSummary.mockResolvedValue({})

    await expect(service.generateAiSummary('1')).resolves.toEqual({ ai_summary: 'resumo novo' })
    expect(ai_service.summarize).toHaveBeenCalledWith('texto da comunicação')
    expect(repository.updateAiSummary).toHaveBeenCalledWith('1', 'resumo novo')
  })
})
