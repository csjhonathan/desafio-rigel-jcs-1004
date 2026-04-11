import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `Você é um assistente jurídico especializado em comunicações processuais do Diário de Justiça Eletrônico.
Sua função é resumir comunicações processuais de forma clara e objetiva para advogados e partes interessadas.
Seja conciso, técnico quando necessário, e destaque os pontos mais relevantes.`

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)
  private readonly client: Anthropic | null

  constructor(private readonly config: ConfigService) {
    const api_key = config.get<string>('ANTHROPIC_API_KEY')
    this.client = api_key ? new Anthropic({ apiKey: api_key }) : null

    if (!this.client) {
      this.logger.warn('ANTHROPIC_API_KEY não configurada — resumos por IA indisponíveis')
    }
  }

  async summarize(content: string): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException('Serviço de IA não configurado')
    }

    if (!content.trim()) {
      return 'Conteúdo da comunicação não disponível para resumo.'
    }

    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Resuma a seguinte comunicação processual em até 3 parágrafos, destacando:\n1. O que foi decidido ou comunicado\n2. Prazos ou datas importantes\n3. Próximos passos necessários\n\nComunicação:\n${content}`,
        },
      ],
    })

    const text_block = message.content.find((b) => b.type === 'text')
    if (!text_block || text_block.type !== 'text') {
      throw new ServiceUnavailableException('Resposta inesperada da API de IA')
    }

    return text_block.text
  }
}
