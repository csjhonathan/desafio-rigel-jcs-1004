import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { addCalendarDaysYmd, brazilCivilDayStartUtc } from '../../common/brazil-calendar-day'
import { PrismaService } from '../../prisma/prisma.service'
import { FilterCommunicationsDto } from './dto/filter-communications.dto'

const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 20

@Injectable()
export class CommunicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: FilterCommunicationsDto) {
    const page = Math.max(1, Number(filters.page ?? 1))
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(filters.limit ?? DEFAULT_PAGE_SIZE)))
    const skip = (page - 1) * limit

    const where: Prisma.CommunicationWhereInput = {}

    if (filters.start_date || filters.end_date) {
      where.available_at = {}
      if (filters.start_date) {
        where.available_at.gte = brazilCivilDayStartUtc(filters.start_date)
      }
      if (filters.end_date) {
        const endExclusiveYmd = addCalendarDaysYmd(filters.end_date, 1)
        where.available_at.lt = brazilCivilDayStartUtc(endExclusiveYmd)
      }
    }

    if (filters.tribunal) {
      where.tribunal = { contains: filters.tribunal, mode: 'insensitive' }
    }

    if (filters.process_number) {
      where.process_number = { contains: filters.process_number, mode: 'insensitive' }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.communication.findMany({
        where,
        skip,
        take: limit,
        /** Empates em `available_at` são comuns; sem 2.º critério a ordem muda após UPDATE (ex. ai_summary). */
        orderBy: [{ available_at: 'desc' }, { id: 'desc' }],
        include: { recipients: true },
      }),
      this.prisma.communication.count({ where }),
    ])

    return {
      data,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    }
  }

  async findById(id: string) {
    return this.prisma.communication.findUnique({
      where: { id },
      include: { recipients: true },
    })
  }

  async findByProcessNumber(process_number: string) {
    return this.prisma.communication.findMany({
      where: { process_number },
      include: { recipients: true },
      orderBy: [{ available_at: 'desc' }, { id: 'desc' }],
    })
  }

  async upsert(data: {
    external_id: string
    process_number: string
    tribunal: string
    available_at: Date
    kind: string
    content?: string
    has_res_judicata: boolean
    recipients: Array<{ name: string; kind: string }>
  }): Promise<{ was_created: boolean }> {
    const existing = await this.prisma.communication.findUnique({
      where: { external_id: data.external_id },
      select: { id: true },
    })

    await this.prisma.communication.upsert({
      where: { external_id: data.external_id },
      update: {
        process_number: data.process_number,
        tribunal: data.tribunal,
        available_at: data.available_at,
        kind: data.kind,
        content: data.content,
        has_res_judicata: data.has_res_judicata,
      },
      create: {
        external_id: data.external_id,
        process_number: data.process_number,
        tribunal: data.tribunal,
        available_at: data.available_at,
        kind: data.kind,
        content: data.content,
        has_res_judicata: data.has_res_judicata,
        recipients: {
          create: data.recipients,
        },
      },
    })

    return { was_created: !existing }
  }

  async updateAiSummary(id: string, ai_summary: string) {
    return this.prisma.communication.update({
      where: { id },
      data: { ai_summary },
    })
  }
}
