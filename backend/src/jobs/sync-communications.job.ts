import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron } from '@nestjs/schedule'
import { addCalendarDaysYmd, brazilTodayYmd } from '../common/brazil-calendar-day'
import { detectResJudicata } from '../modules/communications/communications.service'
import { CommunicationsRepository } from '../modules/communications/communications.repository'
import { type PjeCommunication, PjeApiClient } from '../pje/pje-api.client'
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

  /** Cron diário: **ontem** em Brasília (5 itens/página até fim da lista ou `PJE_COMMUNICATION_LIMIT_PER_DAY`). Gera 1 SyncLog. */
  async syncForYesterday(): Promise<SyncResult> {
    const yesterday_ymd = addCalendarDaysYmd(brazilTodayYmd(), -1)
    this.logger.log(`Ontem (BRT): ${yesterday_ymd}`)
    return this.withSyncLog((sync_log_id) => this.executeSyncDay(yesterday_ymd, sync_log_id))
  }

  /** Sincroniza um dia específico (`YYYY-MM-DD`). Gera 1 SyncLog. */
  async syncForDate(ymd: string): Promise<SyncResult> {
    return this.withSyncLog((sync_log_id) => this.executeSyncDay(ymd, sync_log_id))
  }

  /**
   * Últimos `days` dias civis em BRT, sem incluir hoje (cada dia respeita `PJE_COMMUNICATION_LIMIT_PER_DAY`).
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

    return this.withSyncLog(async (sync_log_id) => {
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
              return await this.executeSyncDay(ymd, sync_log_id)
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
   * Persiste um lote vindo de uma página da PJE.
   * `total_fetched` no log segue contando **ids únicos** (como no merge antigo por dia).
   */
  private async upsertPjePage(
    items: PjeCommunication[],
    seen_external_ids: Set<string>,
  ): Promise<{ delta_fetched: number; delta_stored: number }> {
    let delta_fetched = 0
    let delta_stored = 0

    for (const item of items) {
      if (!seen_external_ids.has(item.id)) {
        seen_external_ids.add(item.id)
        delta_fetched += 1
      }

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

      if (was_created) delta_stored += 1
      this.logger.debug(`Comunicação ${item.id} ${was_created ? 'inserida' : 'atualizada'}`)
    }

    return { delta_fetched, delta_stored }
  }

  /**
   * Executa a sincronização de um único dia sem criar SyncLog.
   */
  private async executeSyncDay(ymd: string, sync_log_id?: string): Promise<DayCounts> {
    const seen_external_ids = new Set<string>()
    let total_fetched = 0
    let total_stored = 0

    await this.pjeClient.fetchCommunications(ymd, {
      on_page: async (items) => {
        const { delta_fetched, delta_stored } = await this.upsertPjePage(items, seen_external_ids)
        if (sync_log_id) {
          await this.prisma.syncLog.update({
            where: { id: sync_log_id },
            data: { total_fetched: { increment: delta_fetched }, total_stored: { increment: delta_stored } },
          })
        }
        total_fetched += delta_fetched
        total_stored += delta_stored
      },
    })

    this.logger.log(`${ymd}: ${total_fetched} obtidas, ${total_stored} novas armazenadas`)
    return { total_fetched, total_stored }
  }

  /** Totais persistidos no `SyncLog` (fonte única para API e front). */
  private async readSyncLogCounts(sync_log_id: string): Promise<DayCounts> {
    const row = await this.prisma.syncLog.findUnique({
      where: { id: sync_log_id },
      select: { total_fetched: true, total_stored: true },
    })
    return {
      total_fetched: row?.total_fetched ?? 0,
      total_stored: row?.total_stored ?? 0,
    }
  }

  /**
   * Cria um SyncLog no início, executa `fn` e atualiza o log ao final.
   * `total_fetched` / `total_stored` no registro são atualizados durante `fn` (incrementos por página);
   * aqui só marcamos término e sucesso. O retorno usa os valores lidos do banco.
   */
  private async withSyncLog(fn: (sync_log_id: string) => Promise<DayCounts>): Promise<SyncResult> {
    const sync_log = await this.prisma.syncLog.create({ data: { success: false } })

    try {
      await fn(sync_log.id)

      await this.prisma.syncLog.update({
        where: { id: sync_log.id },
        data: { ended_at: new Date(), success: true },
      })

      const counts = await this.readSyncLogCounts(sync_log.id)
      this.logger.log(`Sincronização concluída: ${counts.total_fetched} obtidas, ${counts.total_stored} novas`)
      return { success: true, ...counts }
    } catch (err) {
      const error_message = (err as Error).message
      this.logger.error('Erro na sincronização:', error_message)

      await this.prisma.syncLog.update({
        where: { id: sync_log.id },
        data: { ended_at: new Date(), success: false, error_message },
      })

      const counts = await this.readSyncLogCounts(sync_log.id)
      return { success: false, ...counts }
    }
  }
}
