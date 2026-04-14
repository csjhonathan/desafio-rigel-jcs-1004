import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

const SYSTEM_PROMPT = `Você é um assistente jurídico especializado em comunicações processuais do Diário de Justiça Eletrônico.
Sua função é resumir comunicações processuais de forma clara e objetiva para advogados e partes interessadas.
Seja conciso, técnico quando necessário, e destaque os pontos mais relevantes.`

const USER_SUMMARY_INSTRUCTION = `Resuma a seguinte comunicação processual em até 3 parágrafos, destacando:
1. O que foi decidido ou comunicado
2. Prazos ou datas importantes
3. Próximos passos necessários

Comunicação:
`

const GEMINI_MAX_ATTEMPTS = 2

/** REST v1beta — header `x-goog-api-key`, `contents[].parts[].text`. */
const GEMINI_REST_BASE = 'https://generativelanguage.googleapis.com/v1beta'

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)
  private readonly gemini_api_key: string | null
  private readonly gemini_model_name: string
  private readonly gemini_max_input_chars: number

  /** Um pedido Gemini de cada vez por processo (reduz TPM/RPM no free tier). */
  private gemini_queue_tail: Promise<unknown> = Promise.resolve()

  constructor(private readonly config: ConfigService) {
    const gemini_key = config.get<string>('GEMINI_API_KEY')?.trim()
    this.gemini_api_key = gemini_key && gemini_key.length > 0 ? gemini_key : null

    const gemini_model_raw = config.get<string>('GEMINI_MODEL')
    this.gemini_model_name =
      typeof gemini_model_raw === 'string' && gemini_model_raw.trim() !== ''
        ? gemini_model_raw.trim()
        : 'gemini-flash-latest'

    const max_chars = config.get<number>('GEMINI_MAX_INPUT_CHARS')
    this.gemini_max_input_chars =
      typeof max_chars === 'number' && Number.isFinite(max_chars) && max_chars >= 2000
        ? Math.min(Math.floor(max_chars), 500_000)
        : 12_000

    if (this.gemini_api_key) {
      this.logger.log(
        `Resumos por IA: Google Gemini (${this.gemini_model_name}), fila serial, até ${this.gemini_max_input_chars} caracteres por pedido`,
      )
    } else {
      this.logger.warn('GEMINI_API_KEY não configurada — resumos por IA indisponíveis')
    }
  }

  async summarize(content: string): Promise<string> {
    if (!content.trim()) {
      return 'Conteúdo da comunicação não disponível para resumo.'
    }

    if (!this.gemini_api_key) {
      throw new ServiceUnavailableException('Serviço de IA não configurado (GEMINI_API_KEY)')
    }

    return this.enqueueGemini(() => this.summarizeWithGeminiExclusive(content))
  }

  private enqueueGemini<T>(fn: () => Promise<T>): Promise<T> {
    const task = this.gemini_queue_tail.then(() => fn())
    this.gemini_queue_tail = task.then(
      () => undefined,
      () => undefined,
    )
    return task
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private clipContentForGemini(content: string): string {
    const max = this.gemini_max_input_chars
    if (content.length <= max) return content
    this.logger.debug(`Gemini: texto truncado de ${content.length} para ${max} caracteres`)
    return `${content.slice(0, max)}\n\n[Texto truncado por limite GEMINI_MAX_INPUT_CHARS.]`
  }

  private parseGeminiRetrySeconds(err: unknown): number | null {
    const text = err instanceof Error ? err.message : String(err)
    const m = text.match(/retry in ([\d.]+)\s*s/i)
    if (!m) return null
    const sec = Math.ceil(parseFloat(m[1]))
    if (!Number.isFinite(sec) || sec < 1) return null
    return Math.min(sec, 90)
  }

  private isGeminiQuotaHardStop(err: unknown): boolean {
    const text = err instanceof Error ? err.message : String(err)
    return /\blimit:\s*0\b/.test(text)
  }

  private isGeminiQuotaOrRateError(err: unknown): boolean {
    const text = err instanceof Error ? err.message : String(err)
    return /RESOURCE_EXHAUSTED|QuotaFailure|429|generativelanguage\.googleapis|Please retry/i.test(text)
  }

  private throwGeminiQuotaHttpException(last_err: unknown): never {
    const last_wait = this.parseGeminiRetrySeconds(last_err)
    throw new HttpException(
      {
        error: 'gemini_quota_or_rate',
        message: this.isGeminiQuotaHardStop(last_err)
          ? 'Cota gratuita do Gemini para este modelo/projeto esgotada (limit: 0). Tente outro GEMINI_MODEL, outra chave/projeto Google ou amanhã. https://ai.google.dev/gemini-api/docs/rate-limits'
          : last_wait != null
            ? `Limite do Gemini (free tier). Aguarde ~${last_wait}s e tente de novo. Evite vários resumos ao mesmo tempo. https://ai.google.dev/gemini-api/docs/rate-limits`
            : 'Limite do Gemini atingido. Aguarde ou altere modelo/projeto. https://ai.google.dev/gemini-api/docs/rate-limits',
        retry_after_seconds: this.isGeminiQuotaHardStop(last_err) ? undefined : (last_wait ?? undefined),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    )
  }

  /**
   * @see https://ai.google.dev/api/rest/v1beta/models/generateContent
   */
  private async geminiRestGenerateContent(user_prompt: string): Promise<string> {
    const api_key = this.gemini_api_key
    if (!api_key) {
      throw new ServiceUnavailableException('GEMINI_API_KEY não configurada')
    }

    const url = `${GEMINI_REST_BASE}/models/${encodeURIComponent(this.gemini_model_name)}:generateContent`
    const payload = {
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          parts: [{ text: user_prompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 1024,
      },
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': api_key,
      },
      body: JSON.stringify(payload),
    })

    const raw_text = await res.text()
    if (!res.ok) {
      throw new Error(raw_text)
    }

    let data: unknown
    try {
      data = JSON.parse(raw_text) as unknown
    } catch {
      throw new ServiceUnavailableException('Resposta JSON inválida da API Gemini')
    }

    const d = data as {
      error?: { message?: string }
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      promptFeedback?: { blockReason?: string }
    }

    if (d.error?.message) {
      throw new Error(d.error.message)
    }

    const block = d.promptFeedback?.blockReason
    if (block) {
      throw new ServiceUnavailableException(`Prompt bloqueado pela API Gemini (${block})`)
    }

    const parts = d.candidates?.[0]?.content?.parts
    const text =
      parts
        ?.map((p) => p.text)
        .filter((t): t is string => typeof t === 'string')
        .join('')
        .trim() ?? ''

    if (!text) {
      throw new ServiceUnavailableException('Resposta vazia da API Gemini')
    }
    return text
  }

  private async summarizeWithGeminiExclusive(content: string): Promise<string> {
    const body = this.clipContentForGemini(content)
    const prompt = `${USER_SUMMARY_INSTRUCTION}${body}`
    let last_err: unknown

    for (let attempt = 0; attempt < GEMINI_MAX_ATTEMPTS; attempt++) {
      try {
        return await this.geminiRestGenerateContent(prompt)
      } catch (err) {
        last_err = err
        if (err instanceof ServiceUnavailableException) throw err

        if (this.isGeminiQuotaHardStop(err)) {
          this.logger.warn('Gemini: cota com limit 0 — sem retry longo')
          this.throwGeminiQuotaHttpException(err)
        }

        const wait_sec = this.parseGeminiRetrySeconds(err)
        if (wait_sec != null && attempt < GEMINI_MAX_ATTEMPTS - 1) {
          this.logger.warn(
            `Gemini free tier: aguardando ${wait_sec}s antes de 1 nova tentativa (${attempt + 1}/${GEMINI_MAX_ATTEMPTS})`,
          )
          await this.sleep(wait_sec * 1000)
          continue
        }

        break
      }
    }

    this.logger.warn(
      `Gemini generateContent falhou: ${last_err instanceof Error ? last_err.message : String(last_err)}`,
    )

    if (this.isGeminiQuotaOrRateError(last_err)) {
      this.throwGeminiQuotaHttpException(last_err)
    }

    throw new ServiceUnavailableException('Falha ao gerar resumo com Gemini')
  }
}
