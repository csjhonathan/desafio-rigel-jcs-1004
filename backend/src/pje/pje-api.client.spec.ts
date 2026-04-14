import { parsePjeListResponse } from './pje-api.client'

describe('parsePjeListResponse', () => {
  it('aceita resposta mínima com um item', () => {
    const raw = {
      items: [
        {
          id: 'abc',
          siglaTribunal: 'TJSP',
          tipoComunicacao: 'Intimação',
          destinatarios: [{ nome: 'Fulano', polo: 'A' }],
        },
      ],
    }
    const parsed = parsePjeListResponse(raw)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.items).toHaveLength(1)
    expect(parsed.data.items[0].id).toBe('abc')
    expect(parsed.data.items[0].numeroProcesso).toBe('abc')
    expect(parsed.data.items[0].destinatarios[0]).toEqual({ nome: 'Fulano', tipo: 'A' })
  })

  it('normaliza id numérico para string', () => {
    const parsed = parsePjeListResponse({
      items: [{ id: 42, siglaTribunal: 'TRF', tipoComunicacao: 'X', destinatarios: [] }],
    })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.items[0].id).toBe('42')
  })

  it('usa data_disponibilizacao snake_case quando camelCase ausente', () => {
    const parsed = parsePjeListResponse({
      items: [
        {
          id: '1',
          siglaTribunal: 'TJMG',
          tipoComunicacao: 'Y',
          data_disponibilizacao: '2026-04-10',
          destinatarios: [],
        },
      ],
    })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.items[0].dataDisponibilizacao).toBe('2026-04-10')
  })

  it('usa numero_processo quando numeroProcesso ausente', () => {
    const parsed = parsePjeListResponse({
      items: [
        {
          id: '99',
          siglaTribunal: 'TJSP',
          tipoComunicacao: 'Z',
          numero_processo: '0001-00.0000.0.00.0000',
          destinatarios: [],
        },
      ],
    })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.items[0].numeroProcesso).toBe('0001-00.0000.0.00.0000')
  })

  it('falha quando items não é array', () => {
    const parsed = parsePjeListResponse({ items: {} })
    expect(parsed.success).toBe(false)
  })

  it('falha quando falta campo obrigatório em item', () => {
    const parsed = parsePjeListResponse({
      items: [{ id: '1', siglaTribunal: 'X' }],
    })
    expect(parsed.success).toBe(false)
  })
})
