import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { z } from 'zod'

const RATE_LIMIT_RETRY_MS = 60_000
const MAX_429_RETRIES = 5
/** Pausa mínima entre pedidos de página (ms); reduz 429. */
const DEFAULT_PAGE_DELAY_MS = 800
/** Máximo de páginas por dia (itensPorPagina=5 → 50 registros com 10 páginas). */
const DEFAULT_MAX_PAGES_PER_DAY = 10

/** Destinatário: API retorna `polo` (P/A); versões antigas podem usar `tipo`. */
const recipient_schema = z
  .object({
    nome: z.string(),
    polo: z.string().optional(),
    tipo: z.string().optional(),
  })
  .transform((d) => ({
    nome: d.nome,
    tipo: (d.polo ?? d.tipo ?? '?').trim() || '?',
  }))

/** Item da API com campos camelCase e snake_case misturados. */
const communication_raw = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    siglaTribunal: z.string(),
    tipoComunicacao: z.string(),
    texto: z.string().optional().nullable(),
    numeroProcesso: z.string().optional(),
    numero_processo: z.string().optional(),
    dataDisponibilizacao: z.string().optional(),
    data_disponibilizacao: z.string().optional(),
    destinatarios: z.array(recipient_schema).optional().default([]),
  })
  .transform((row) => {
    const process_number = row.numeroProcesso ?? row.numero_processo ?? ''
    const date_str =
      row.dataDisponibilizacao ?? row.data_disponibilizacao ?? ''
    return {
      id: row.id,
      numeroProcesso: process_number || row.id,
      siglaTribunal: row.siglaTribunal,
      dataDisponibilizacao: date_str,
      tipoComunicacao: row.tipoComunicacao,
      texto: row.texto,
      destinatarios: row.destinatarios,
    }
  })

const response_schema = z.object({
  status: z.string().optional(),
  message: z.string().optional(),
  count: z.number().optional(),
  items: z.array(communication_raw),
})

export type PjeCommunication = z.infer<typeof communication_raw>

@Injectable()
export class PjeApiClient {
  private readonly logger = new Logger(PjeApiClient.name)
  private readonly base_url: string

  constructor(private readonly config: ConfigService) {
    this.base_url = config.get<string>('PJE_API_BASE_URL', 'https://comunicaapi.pje.jus.br/api/v1')
  }

  private basePageDelayMs(): number {
    const n = Number(this.config.get<string>('PJE_PAGE_DELAY_MS'))
    if (Number.isFinite(n) && n >= 50) return Math.min(n, 30_000)
    return DEFAULT_PAGE_DELAY_MS
  }

  /** Páginas 1..N por dia (cada uma até 5 itens). */
  private maxPagesPerDay(): number {
    const raw = Number(this.config.get('PJE_SYNC_MAX_PAGES_PER_DAY'))
    if (Number.isFinite(raw) && raw >= 1) return Math.min(100, Math.floor(raw))
    return DEFAULT_MAX_PAGES_PER_DAY
  }

  private logRateLimit(response: Response) {
    const limit = response.headers.get('x-ratelimit-limit')
    const remaining = response.headers.get('x-ratelimit-remaining')
    if (limit != null || remaining != null) {
      this.logger.debug(`PJE rate-limit limit=${limit} remaining=${remaining}`)
    }
  }

  /** Espera antes do próximo pedido de página, com base no cabeçalho `remaining`. */
  private async paceBeforeNextPage(response: Response): Promise<void> {
    const base = this.basePageDelayMs()
    let ms = base
    const rem_raw = response.headers.get('x-ratelimit-remaining')
    if (rem_raw != null) {
      const rem = parseInt(rem_raw, 10)
      if (!Number.isNaN(rem)) {
        if (rem <= 1) ms = Math.max(base, 4_000)
        else if (rem <= 5) ms = Math.max(base, 2_500)
        else if (rem <= 15) ms = Math.max(base, 1_500)
      }
    }
    await this.sleep(ms)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async fetchJson(url: string): Promise<{ data: unknown; response: Response }> {
    let attempt = 0
    while (true) {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      })

      this.logRateLimit(response)

      if (response.status === 429) {
        attempt++
        if (attempt > MAX_429_RETRIES) {
          throw new Error(`PJE API 429: limite de tentativas após aguardar ${MAX_429_RETRIES} minuto(s)`)
        }
        this.logger.warn(
          `PJE API 429 (tentativa ${attempt}/${MAX_429_RETRIES}): aguardando 60s conforme orientação da API...`,
        )
        await this.sleep(RATE_LIMIT_RETRY_MS)
        continue
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        throw new Error(`PJE API status ${response.status}: ${body.slice(0, 200)}`)
      }

      const data = await response.json()
      return { data, response }
    }
  }

  /**
   * Lista comunicações de um dia: `pagina` de 1 até no máximo `PJE_SYNC_MAX_PAGES_PER_DAY` (predef. 10),
   * `itensPorPagina=5` → no máximo 50 registros/dia por defeito. Para antes se a página vier vazia ou incompleta.
   */
  async fetchCommunications(date: Date): Promise<PjeCommunication[]> {
    const date_str = date.toISOString().split('T')[0]
    const items_per_page = 5 as const
    const max_pages = this.maxPagesPerDay()

    const all: PjeCommunication[] = []

    this.logger.log(
      `${date_str}: até ${max_pages} página(s) × 5 itens; pausa ~${this.basePageDelayMs()}ms entre páginas`,
    )

    for (let page = 1; page <= max_pages; page++) {
      const params = new URLSearchParams()
      params.set('dataDisponibilizacaoInicio', date_str)
      params.set('dataDisponibilizacaoFim', date_str)
      params.set('pagina', String(page))
      params.set('itensPorPagina', String(items_per_page))

      const url = `${this.base_url}/comunicacao?${params.toString()}`
      const { data: raw, response } = await this.fetchJson(url)
      const parsed = response_schema.safeParse(raw)

      if (!parsed.success) {
        this.logger.error('Resposta da API do PJE não corresponde ao schema esperado', parsed.error.issues)
        throw new Error('Formato de resposta inválido da API do PJE')
      }

      const { items, count } = parsed.data
      if (page === 1 && count != null) {
        this.logger.log(`PJE count=${count} (total reportado para o dia; sync limitada a ${max_pages} páginas)`)
      }

      all.push(...items)

      if (items.length === 0) break
      if (items.length < items_per_page) break
      if (page < max_pages) await this.paceBeforeNextPage(response)
    }

    this.logger.log(`Total ${all.length} comunicações em ${date_str}`)
    return all
  }

  async fetchLastDays(days: number): Promise<PjeCommunication[]> {
    const all_communications: PjeCommunication[] = []

    for (let i = 1; i <= days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)

      try {
        const items = await this.fetchCommunications(date)
        all_communications.push(...items)
        this.logger.log(`Dia -${i}: ${items.length} comunicações`)
        if (i < days) {
          await this.sleep(this.basePageDelayMs() * 2)
        }
      } catch (err) {
        this.logger.warn(`Erro ao buscar comunicações do dia -${i}: ${(err as Error).message}`)
      }
    }

    return all_communications
  }
}
