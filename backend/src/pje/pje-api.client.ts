import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { z } from 'zod'
import { addCalendarDaysYmd, brazilTodayYmd } from '../common/brazil-calendar-day'

const RATE_LIMIT_RETRY_MS = 60_000
const MAX_429_RETRIES = 5
/** Pausa mínima entre pedidos de página (ms); reduz 429. */
const DEFAULT_PAGE_DELAY_MS = 800

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

/** Resposta de `GET /comunicacao/tribunal` (lista oficial de siglas). */
const tribunal_institution_schema = z.object({
  sigla: z.string(),
  nome: z.string().optional(),
  dataUltimoEnvio: z.string().optional(),
  active: z.boolean().optional(),
})

const tribunal_uf_group_schema = z.object({
  uf: z.string(),
  nomeEstado: z.string().optional(),
  instituicoes: z.array(tribunal_institution_schema),
})

const tribunais_list_schema = z.array(tribunal_uf_group_schema)

export type PjeCommunication = z.infer<typeof communication_raw>

export type FetchCommunicationsOptions = {
  /**
   * Chamado após cada página retornada pela PJE (antes da pausa entre páginas).
   * Se definido, `fetchCommunications` retorna `[]` e não acumula itens em memória.
   */
  on_page?: (items: PjeCommunication[]) => Promise<void>
}

@Injectable()
export class PjeApiClient {
  private readonly logger = new Logger(PjeApiClient.name)
  private readonly base_url: string
  /** Siglas únicas do último `GET /comunicacao/tribunal` bem-sucedido (por processo). */
  private tribunal_siglas_cache: string[] | null = null

  constructor(private readonly config: ConfigService) {
    this.base_url = config.get<string>('PJE_API_BASE_URL', 'https://comunicaapi.pje.jus.br/api/v1')
  }

  private basePageDelayMs(): number {
    const n = Number(this.config.get<string>('PJE_PAGE_DELAY_MS'))
    if (Number.isFinite(n) && n >= 50) return Math.min(n, 30_000)
    return DEFAULT_PAGE_DELAY_MS
  }

  private async fetchTribunalSiglasFromApi(): Promise<string[]> {
    const url = `${this.base_url}/comunicacao/tribunal`
    const { data: raw } = await this.fetchJson(url)
    const parsed = tribunais_list_schema.safeParse(raw)
    if (!parsed.success) {
      this.logger.error('Resposta de /comunicacao/tribunal inesperada', parsed.error.issues)
      throw new Error('Formato inválido em GET /comunicacao/tribunal')
    }
    const unique = new Set<string>()
    for (const group of parsed.data) {
      for (const inst of group.instituicoes) {
        const s = inst.sigla.trim()
        if (s !== '') unique.add(s)
      }
    }
    const sorted = Array.from(unique).sort((a, b) => a.localeCompare(b, 'pt-BR'))
    if (sorted.length === 0) {
      throw new Error('GET /comunicacao/tribunal não retornou nenhuma sigla')
    }
    return sorted
  }

  /** Lista oficial de siglas; cache em memória por processo (uma chamada à API). */
  private async resolveTribunalSiglas(): Promise<string[]> {
    if (this.tribunal_siglas_cache !== null) return this.tribunal_siglas_cache

    const siglas = await this.fetchTribunalSiglasFromApi()
    this.tribunal_siglas_cache = siglas
    this.logger.log(`Siglas de tribunal (API /comunicacao/tribunal): ${siglas.length} únicas`)
    return siglas
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
   * Sempre **dia → cada sigla** (`GET /comunicacao/tribunal`, cache) **→ páginas com `siglaTribunal` e 100 itens**,
   * até a resposta trazer `count` (ou tamanho de `items`) menor que 100.
   * Opcional: `on_page` persiste cada página antes da pausa; nesse caso o retorno é `[]`.
   */
  async fetchCommunications(
    date: Date | string,
    options?: FetchCommunicationsOptions,
  ): Promise<PjeCommunication[]> {
    const date_str = this.normalizeDateString(date)
    const items_per_page = 100 as const
    const on_page = options?.on_page

    const siglas = await this.resolveTribunalSiglas()
    const by_id = on_page ? null : new Map<string, PjeCommunication>()

    this.logger.log(
      `${date_str}: por tribunal (${siglas.length} siglas), ${items_per_page} itens/página; parar quando retorno < ${items_per_page} (count da PJE se ≤ ${items_per_page}, senão items.length); pausa ~${this.basePageDelayMs()}ms`,
    )

    for (const sigla of siglas) {
      try {
        let page = 1
        let page_returned: number = 0
        do {
          const params = new URLSearchParams()
          params.set('dataDisponibilizacaoInicio', date_str)
          params.set('dataDisponibilizacaoFim', date_str)
          params.set('siglaTribunal', sigla)
          params.set('pagina', String(page))
          params.set('itensPorPagina', String(items_per_page))

          const url = `${this.base_url}/comunicacao?${params.toString()}`
          const { data: raw, response } = await this.fetchJson(url)

          if (this.isPjeApiErrorPayload(raw)) {
            this.logger.warn(
              `PJE ${sigla} (${date_str}) página ${page}: ${this.pjeApiErrorMessage(raw)}`,
            )
            break
          }

          const parsed = response_schema.safeParse(raw)
          if (!parsed.success) {
            this.logger.error(
              `Resposta inválida PJE sigla=${sigla} página=${page}`,
              parsed.error.issues,
            )
            throw new Error('Formato de resposta inválido da API do PJE')
          }

          const { items, count } = parsed.data
          /**
           * Quantidade “desta página” para decidir parada: se `count` ≤ 100, é o tamanho da página (ex. 44 na última).
           * Se `count` for maior (total do filtro na PJE), usa-se `items.length`.
           */
          page_returned = count != null && count <= items_per_page ? count : items.length
          if (page === 1 && count != null) {
            this.logger.debug(`PJE ${sigla} página 1: count(resposta)=${count}, items.length=${items.length}`)
          }

          if (items.length > 0) {
            await on_page?.(items)
            if (by_id) {
              for (const item of items) {
                by_id.set(item.id, item)
              }
            }
          }

          if (page_returned === items_per_page) {
            await this.paceBeforeNextPage(response)
            page += 1
          }
        } while (page_returned === items_per_page)
      } catch (err) {
        this.logger.warn(`Falha ao buscar ${sigla} em ${date_str}: ${(err as Error).message}`)
      }
    }

    if (on_page) {
      this.logger.log(`${date_str}: páginas concluídas (persistência incremental por página)`)
      return []
    }

    const merged = Array.from(by_id!.values())
    this.logger.log(`Total ${merged.length} comunicações únicas em ${date_str} (após merge por tribunal)`)
    return merged
  }
}
