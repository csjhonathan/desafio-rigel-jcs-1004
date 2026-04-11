import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { z } from 'zod'

const recipient_schema = z.object({
  nome: z.string(),
  tipo: z.string(),
})

const communication_schema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  numeroProcesso: z.string(),
  siglaTribunal: z.string(),
  dataDisponibilizacao: z.string(),
  tipoComunicacao: z.string(),
  texto: z.string().optional().nullable(),
  destinatarios: z.array(recipient_schema).default([]),
})

const response_schema = z.object({
  items: z.array(communication_schema),
  totalItems: z.number().optional(),
})

export type PjeCommunication = z.infer<typeof communication_schema>

@Injectable()
export class PjeApiClient {
  private readonly logger = new Logger(PjeApiClient.name)
  private readonly base_url: string

  constructor(private readonly config: ConfigService) {
    this.base_url = config.get<string>('PJE_API_BASE_URL', 'https://comunicaapi.pje.jus.br/api/v1')
  }

  async fetchCommunications(date: Date): Promise<PjeCommunication[]> {
    const date_str = date.toISOString().split('T')[0]
    const url = `${this.base_url}/comunicacao?dataDisponibilizacao=${date_str}&size=100`

    this.logger.log(`Buscando comunicações para a data ${date_str}`)

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`PJE API retornou status ${response.status} para data ${date_str}`)
    }

    const raw = await response.json()
    const parsed = response_schema.safeParse(raw)

    if (!parsed.success) {
      this.logger.error('Resposta da API do PJE não corresponde ao schema esperado', parsed.error.issues)
      throw new Error('Formato de resposta inválido da API do PJE')
    }

    return parsed.data.items
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
      } catch (err) {
        this.logger.warn(`Erro ao buscar comunicações do dia -${i}: ${(err as Error).message}`)
      }
    }

    return all_communications
  }
}
