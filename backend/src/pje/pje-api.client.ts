import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { z } from 'zod'

const RATE_LIMIT_RETRY_MS = 60_000
const MAX_429_RETRIES = 5
/** Pausa mínima entre pedidos de página (ms); reduz 429. */
const DEFAULT_PAGE_DELAY_MS = 800
const ITEMS_PER_PAGE = 5
/** Predefinido se `PJE_COMMUNICATION_LIMIT_PER_DAY` não estiver definido. */
const DEFAULT_COMMUNICATION_LIMIT_PER_DAY = 2500

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

export type FetchCommunicationsOptions = {
  /**
   * Chamado após cada página retornada pela PJE (antes da pausa entre páginas).
   * Se definido, `fetchCommunications` retorna `[]` e não acumula itens em memória.
   */
  on_page?: (items: PjeCommunication[]) => Promise<void>
  /** Sobrescreve o teto diário (ex. testes). */
  max_items_per_day?: number
}

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

  private resolveCommunicationLimitPerDay(options?: FetchCommunicationsOptions): number {
    if (options?.max_items_per_day != null) {
      const n = Math.floor(options.max_items_per_day)
      if (Number.isFinite(n) && n >= 1) return Math.min(n, 1_000_000)
    }
    const from_config = this.config.get<number>('PJE_COMMUNICATION_LIMIT_PER_DAY')
    if (typeof from_config === 'number' && Number.isFinite(from_config) && from_config >= 1) {
      return Math.min(Math.floor(from_config), 1_000_000)
    }
    return DEFAULT_COMMUNICATION_LIMIT_PER_DAY
  }

  private isPjeApiErrorPayload(raw: unknown): raw is { status: string; message?: string } {
    return (
      typeof raw === 'object' &&
      raw !== null &&
      'status' in raw &&
      (raw as { status: unknown }).status === 'error'
    )
  }

  private pjeApiErrorMessage(raw: { message?: unknown }): string {
    return typeof raw.message === 'string' ? raw.message : 'erro desconhecido da API do PJE'
  }

  private normalizeDateString(date: Date | string): string {
    if (typeof date === 'string') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new RangeError(`data inválida (use YYYY-MM-DD): ${date}`)
      }
      return date
    }
    return date.toISOString().split('T')[0]
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
        headers: {
          Accept: 'application/json',
          'ngrok-skip-browser-warning': '1',
        },
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
   * Lista comunicações de um dia civil em Brasília (`YYYY-MM-DD`) ou `Date` (menos fiável; prefira string).
   * - `itensPorPagina=5` (regra da API). Pagina até:
   * - a página indicar fim (`count` da resposta ≤ 5 quando usado como tamanho da página, senão `items.length` &lt; 5), ou
   * - `PJE_COMMUNICATION_LIMIT_PER_DAY` (predef. 2500) itens já processados nesse dia.
   * Opcional: `on_page` persiste cada lote antes da pausa; nesse caso o retorno é `[]`.
   */
  async fetchCommunications(
    date: Date | string,
    options?: FetchCommunicationsOptions,
  ): Promise<PjeCommunication[]> {
    const date_str = this.normalizeDateString(date)
    const on_page = options?.on_page
    const max_per_day = this.resolveCommunicationLimitPerDay(options)
    const by_id = on_page ? null : new Map<string, PjeCommunication>()

    this.logger.log(
      `${date_str}: GET /comunicacao (sem filtro de tribunal), ${ITEMS_PER_PAGE} itens/página; parar se retorno < ${ITEMS_PER_PAGE} ou após ${max_per_day} itens no dia; pausa base ~${this.basePageDelayMs()}ms`,
    )

    let accumulated = 0
    let page = 1

    while (accumulated < max_per_day) {
      const params = new URLSearchParams()
      params.set('dataDisponibilizacaoInicio', date_str)
      params.set('dataDisponibilizacaoFim', date_str)
      params.set('pagina', String(page))
      params.set('itensPorPagina', String(ITEMS_PER_PAGE))

      const url = `${this.base_url}/comunicacao?${params.toString()}`
      const { data: raw, response } = await this.fetchJson(url)

      if (this.isPjeApiErrorPayload(raw)) {
        this.logger.warn(`PJE (${date_str}) página ${page}: ${this.pjeApiErrorMessage(raw)}`)
        break
      }

      const parsed = response_schema.safeParse(raw)
      if (!parsed.success) {
        this.logger.error(`Resposta inválida PJE página=${page}`, parsed.error.issues)
        throw new Error('Formato de resposta inválido da API do PJE')
      }

      const { items, count } = parsed.data
      /**
       * Tamanho “desta página” para decidir parada: se `count` ≤ 5, a PJE usa como tamanho da página (ex. 3 na última).
       * Se `count` for o total do filtro &gt; 5, usa-se `items.length`.
       */
      const page_returned =
        count != null && count <= ITEMS_PER_PAGE ? count : items.length

      const room = max_per_day - accumulated
      const slice = room <= 0 ? [] : items.slice(0, Math.min(items.length, room))

      if (slice.length > 0) {
        await on_page?.(slice)
        if (by_id) {
          for (const item of slice) {
            by_id.set(item.id, item)
          }
        }
        accumulated += slice.length
      }

      if (accumulated >= max_per_day) break
      if (page_returned < ITEMS_PER_PAGE) break

      await this.paceBeforeNextPage(response)
      page += 1
    }

    if (on_page) {
      this.logger.log(`${date_str}: páginas concluídas (${accumulated} itens processados no dia, teto ${max_per_day})`)
      return []
    }

    const merged = Array.from(by_id!.values())
    this.logger.log(`Total ${merged.length} comunicações em ${date_str} (teto diário ${max_per_day})`)
    return merged
  }
}
