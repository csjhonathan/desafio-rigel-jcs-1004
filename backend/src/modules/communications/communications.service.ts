import { Injectable, NotFoundException } from '@nestjs/common'
import { AiService } from '../ai/ai.service'
import { CommunicationsRepository } from './communications.repository'
import { FilterCommunicationsDto } from './dto/filter-communications.dto'

const RES_JUDICATA_PATTERN = /transit(?:ou|ada)\s+em\s+julgado/i

export function detectResJudicata(content?: string | null): boolean {
  if (!content) return false
  return RES_JUDICATA_PATTERN.test(content)
}

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly communicationsRepository: CommunicationsRepository,
    private readonly aiService: AiService,
  ) {}

  async findAll(filters: FilterCommunicationsDto) {
    return this.communicationsRepository.findAll(filters)
  }

  async findAllByProcessNumber(process_number: string) {
    return this.communicationsRepository.findByProcessNumber(process_number)
  }

  async findById(id: string) {
    const communication = await this.communicationsRepository.findById(id)
    if (!communication) throw new NotFoundException(`Comunicação ${id} não encontrada`)
    return communication
  }

  async generateAiSummary(id: string) {
    const communication = await this.findById(id)

    if (communication.ai_summary) {
      return { ai_summary: communication.ai_summary }
    }

    const summary = await this.aiService.summarize(communication.content ?? '')
    await this.communicationsRepository.updateAiSummary(id, summary)

    return { ai_summary: summary }
  }
}
