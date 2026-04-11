import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { detectResJudicata } from '../modules/communications/communications.service'
import { CommunicationsRepository } from '../modules/communications/communications.repository'
import { PjeApiClient } from '../pje/pje-api.client'
import { PrismaService } from '../prisma/prisma.service'

const CRON_DAILY_SYNC = '0 1 * * *'

@Injectable()
export class SyncCommunicationsJob {
  private readonly logger = new Logger(SyncCommunicationsJob.name)

  constructor(
    private readonly pjeClient: PjeApiClient,
    private readonly communicationsRepository: CommunicationsRepository,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CRON_DAILY_SYNC, { name: 'daily_sync' })
  async handleDailySync() {
    this.logger.log('Iniciando sincronização diária de comunicações')

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    await this.syncForDate(yesterday)
  }

  async syncForDate(date: Date): Promise<{ success: boolean; total_synced: number }> {
    let total_synced = 0
    let error_message: string | undefined

    try {
      const items = await this.pjeClient.fetchCommunications(date)

      for (const item of items) {
        const has_res_judicata = detectResJudicata(item.texto)

        await this.communicationsRepository.upsert({
          external_id: item.id,
          process_number: item.numeroProcesso,
          tribunal: item.siglaTribunal,
          available_at: new Date(item.dataDisponibilizacao),
          kind: item.tipoComunicacao,
          content: item.texto ?? undefined,
          has_res_judicata,
          recipients: item.destinatarios.map((d) => ({
            name: d.nome,
            kind: d.tipo,
          })),
        })

        total_synced++
      }

      this.logger.log(`Sincronização concluída: ${total_synced} comunicações salvas`)

      await this.prisma.syncLog.create({
        data: { success: true, total_synced },
      })

      return { success: true, total_synced }
    } catch (err) {
      error_message = (err as Error).message
      this.logger.error('Erro na sincronização:', error_message)

      await this.prisma.syncLog.create({
        data: { success: false, total_synced, error_message },
      })

      return { success: false, total_synced }
    }
  }

  async syncLastDays(days: number): Promise<{ success: boolean; total_synced: number }> {
    let total_synced = 0

    for (let i = 1; i <= days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const result = await this.syncForDate(date)
      total_synced += result.total_synced
    }

    return { success: true, total_synced }
  }
}
