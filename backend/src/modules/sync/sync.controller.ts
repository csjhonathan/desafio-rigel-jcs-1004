import { Controller, Post } from '@nestjs/common'
import { addCalendarDaysYmd, brazilTodayYmd } from '../../common/brazil-calendar-day'
import { SyncCommunicationsJob } from '../../jobs/sync-communications.job'

@Controller('sync')
export class SyncController {
  constructor(private readonly syncJob: SyncCommunicationsJob) {}

  @Post('trigger')
  async trigger() {
    const date = addCalendarDaysYmd(brazilTodayYmd(), -1)
    const result = await this.syncJob.syncForYesterday()

    return {
      success: result.success,
      total_synced: result.total_synced,
      date,
      message: result.success
        ? `Sincronização concluída: ${result.total_synced} comunicações salvas para ${date}`
        : 'Erro na sincronização — verifique os logs do servidor',
    }
  }
}
