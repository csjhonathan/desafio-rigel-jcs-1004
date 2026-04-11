import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron } from '@nestjs/schedule'
import { detectResJudicata } from '../modules/communications/communications.service'
import { CommunicationsRepository } from '../modules/communications/communications.repository'
import { PjeApiClient } from '../pje/pje-api.client'
import { PrismaService } from '../prisma/prisma.service'

const CRON_DAILY_SYNC = '0 1 * * *'
/** Predefinido 1: menos pressão na PJE; aumentar com PJE_SYNC_DAY_CONCURRENCY se a API aguentar. */
const DEFAULT_DAY_CONCURRENCY = 1
const MAX_DAY_CONCURRENCY = 8

@Injectable()
export class SyncCommunicationsJob {
  private readonly logger = new Logger(SyncCommunicationsJob.name)

  constructor(
    private readonly pjeClient: PjeApiClient,
    private readonly communicationsRepository: CommunicationsRepository,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
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

        console.log(`✅ Comunicação ${item.id} sincronizada`)

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
      this.logger.error(err)

      await this.prisma.syncLog.create({
        data: { success: false, total_synced, error_message },
      })

      return { success: false, total_synced }
    }
  }

  async syncLastDays(days: number): Promise<{ success: boolean; total_synced: number }> {
    let total_synced = 0
    const anchor = new Date()
    const last_dates: Date[] = []

    for (let i = 1; i <= days; i++) {
      const date = new Date(anchor)
      date.setDate(date.getDate() - i)
      last_dates.push(date)
    }

    const raw = Number(this.config.get('PJE_SYNC_DAY_CONCURRENCY'))
    const day_concurrency = Math.min(
      MAX_DAY_CONCURRENCY,
      Math.max(
        1,
        Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : DEFAULT_DAY_CONCURRENCY,
      ),
    )

    this.logger.log(
      `📡 Últimos ${days} dias (ontem → -${days}d), até ${day_concurrency} dia(s) em paralelo: ${last_dates.map((d) => d.toISOString().slice(0, 10)).join(', ')}`,
    )

    for (let i = 0; i < last_dates.length; i += day_concurrency) {
      const batch = last_dates.slice(i, i + day_concurrency)
      const batch_no = Math.floor(i / day_concurrency) + 1
      const batches = Math.ceil(last_dates.length / day_concurrency)
      this.logger.log(
        `Lote ${batch_no}/${batches}: ${batch.map((d) => d.toISOString().slice(0, 10)).join(', ')}`,
      )
      const results = await Promise.all(batch.map((date) => this.syncForDate(date)))
      for (const r of results) total_synced += r.total_synced
    }

    return { success: true, total_synced }
  }
}
