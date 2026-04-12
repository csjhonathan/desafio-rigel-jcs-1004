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

type DayCounts = { total_fetched: number; total_stored: number }
type SyncResult = { success: boolean } & DayCounts

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

  /** Cron diário: **ontem** em Brasília, paginação completa. Gera 1 SyncLog. */
  async syncForYesterday(): Promise<SyncResult> {
    const yesterday_ymd = addCalendarDaysYmd(brazilTodayYmd(), -1)
    this.logger.log(`Ontem (BRT): ${yesterday_ymd} (paginação completa)`)
    return this.withSyncLog(() => this.executeSyncDay(yesterday_ymd, { all_pages: true }))
  }

  /** Sincroniza um dia específico (`YYYY-MM-DD`). Gera 1 SyncLog. */
  async syncForDate(ymd: string, all_pages = false): Promise<SyncResult> {
    return this.withSyncLog(() =>
      this.executeSyncDay(ymd, all_pages ? { all_pages: true } : undefined),
    )
  }

  /**
   * Últimos `days` dias civis em BRT, sem incluir hoje.
   * Gera **1 único SyncLog** com os totais acumulados de todos os dias.
   */
  async syncLastDays(days: number): Promise<SyncResult> {
    const today_brt = brazilTodayYmd()
    const last_ymds: string[] = []

    for (let i = 1; i <= days; i++) {
      last_ymds.push(addCalendarDaysYmd(today_brt, -i))
    }

    const raw = Number(this.config.get('PJE_SYNC_DAY_CONCURRENCY'))
    const day_concurrency = Math.min(
      MAX_DAY_CONCURRENCY,
      Math.max(1, Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : DEFAULT_DAY_CONCURRENCY),
    )

    return this.withSyncLog(async () => {
      let total_fetched = 0
      let total_stored = 0

      for (let i = 0; i < last_ymds.length; i += day_concurrency) {
        const batch = last_ymds.slice(i, i + day_concurrency)
        const batch_no = Math.floor(i / day_concurrency) + 1
        const batches = Math.ceil(last_ymds.length / day_concurrency)
        this.logger.log(`Lote ${batch_no}/${batches}: ${batch.join(', ')}`)

        const results = await Promise.all(
          batch.map(async (ymd) => {
            try {
              return await this.executeSyncDay(ymd)
            } catch (err) {
              this.logger.warn(`Erro ao sincronizar ${ymd}: ${(err as Error).message}`)
              return { total_fetched: 0, total_stored: 0 }
            }
          }),
        )

        for (const r of results) {
          total_fetched += r.total_fetched
          total_stored += r.total_stored
        }
      }

      return { total_fetched, total_stored }
    })
  }

  /**
   * Executa a sincronização de um único dia sem criar SyncLog.
   * Lança erro em caso de falha — o controle de log fica em `withSyncLog`.
   */
  private async executeSyncDay(
    ymd: string,
    fetch_options?: { max_pages?: number; all_pages?: boolean },
  ): Promise<DayCounts> {
    const items = await this.pjeClient.fetchCommunications(ymd, fetch_options)
    const total_fetched = items.length
    let total_stored = 0

    for (const item of items) {
      const has_res_judicata = detectResJudicata(item.texto)

      const { was_created } = await this.communicationsRepository.upsert({
        external_id: item.id,
        process_number: item.numeroProcesso,
        tribunal: item.siglaTribunal,
        available_at: new Date(item.dataDisponibilizacao),
        kind: item.tipoComunicacao,
        content: item.texto ?? undefined,
        has_res_judicata,
        recipients: item.destinatarios.map((d) => ({ name: d.nome, kind: d.tipo })),
      })

      if (was_created) total_stored++
      this.logger.debug(`Comunicação ${item.id} ${was_created ? 'inserida' : 'atualizada'}`)
    }

    this.logger.log(`${ymd}: ${total_fetched} obtidas, ${total_stored} novas armazenadas`)
    return { total_fetched, total_stored }
  }

  /**
   * Cria um SyncLog no início, executa `fn` e atualiza o log ao final.
   * Garante que cada chamada pública gera exatamente 1 entrada no histórico.
   */
  private async withSyncLog(fn: () => Promise<DayCounts>): Promise<SyncResult> {
    const sync_log = await this.prisma.syncLog.create({ data: { success: false } })

    try {
      const { total_fetched, total_stored } = await fn()

      this.logger.log(`Sincronização concluída: ${total_fetched} obtidas, ${total_stored} novas`)
      await this.prisma.syncLog.update({
        where: { id: sync_log.id },
        data: { ended_at: new Date(), success: true, total_fetched, total_stored },
      })

      return { success: true, total_fetched, total_stored }
    } catch (err) {
      const error_message = (err as Error).message
      this.logger.error('Erro na sincronização:', error_message)

      await this.prisma.syncLog.update({
        where: { id: sync_log.id },
        data: { ended_at: new Date(), success: false, error_message },
      })

      return { success: false, total_fetched: 0, total_stored: 0 }
    }
  }
}
