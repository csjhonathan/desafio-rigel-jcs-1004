import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron } from '@nestjs/schedule'
import { addCalendarDaysYmd, brazilTodayYmd } from '../common/brazil-calendar-day'
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

  @Cron(CRON_DAILY_SYNC, { name: 'daily_sync', timeZone: 'America/Sao_Paulo' })
  async handleDailySync() {
    this.logger.log('Iniciando sincronização diária (ontem, calendário BRT)')
    await this.syncForYesterday()
  }

  /**
   * Cron diário: **ontem** em Brasília (`YYYY-MM-DD`), paginação completa na PJE.
   */
  async syncForYesterday(): Promise<{ success: boolean; total_synced: number }> {
    const yesterday_ymd = addCalendarDaysYmd(brazilTodayYmd(), -1)
    this.logger.log(`Ontem (BRT): ${yesterday_ymd} (paginação completa)`)
    return this.syncDay(yesterday_ymd, { all_pages: true })
  }

  /**
   * Um dia civil em Brasília (`YYYY-MM-DD`) com cap do seed (`PJE_SYNC_MAX_PAGES_PER_DAY`).
   * Usado por `syncLastDays` / seed.
   */
  async syncForDate(ymd: string): Promise<{ success: boolean; total_synced: number }> {
    return this.syncDay(ymd, undefined)
  }

  private async syncDay(
    ymd: string,
    fetch_options: { max_pages?: number; all_pages?: boolean } | undefined,
  ): Promise<{ success: boolean; total_synced: number }> {
    let total_synced = 0
    let error_message: string | undefined

    try {
      const items = await this.pjeClient.fetchCommunications(ymd, fetch_options)

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

        this.logger.debug(`Comunicação ${item.id} sincronizada`)

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

  /**
   * Últimos `days` dias civis em **Brasília**, **sem incluir hoje**:
   * ontem, anteontem, … (equivalente a `addCalendarDaysYmd(hoje_brt, -1)` … `-days`).
   */
  async syncLastDays(days: number): Promise<{ success: boolean; total_synced: number }> {
    let total_synced = 0
    const today_brt = brazilTodayYmd()
    const last_ymds: string[] = []

    for (let i = 1; i <= days; i++) {
      last_ymds.push(addCalendarDaysYmd(today_brt, -i))
    }

    const raw = Number(this.config.get('PJE_SYNC_DAY_CONCURRENCY'))
    const day_concurrency = Math.min(
      MAX_DAY_CONCURRENCY,
      Math.max(
        1,
        Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : DEFAULT_DAY_CONCURRENCY,
      ),
    )

    for (let i = 0; i < last_ymds.length; i += day_concurrency) {
      const batch = last_ymds.slice(i, i + day_concurrency)
      const batch_no = Math.floor(i / day_concurrency) + 1
      const batches = Math.ceil(last_ymds.length / day_concurrency)
      this.logger.log(`Lote ${batch_no}/${batches}: ${batch.join(', ')}`)
      const results = await Promise.all(batch.map((ymd) => this.syncForDate(ymd)))
      for (const r of results) total_synced += r.total_synced
    }

    return { success: true, total_synced }
  }
}
