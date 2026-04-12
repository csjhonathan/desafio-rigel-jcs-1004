import { Body, Controller, Logger, Post } from '@nestjs/common'
import { IsDateString, IsOptional } from 'class-validator'
import { addCalendarDaysYmd, brazilTodayYmd } from '../../common/brazil-calendar-day'
import { SyncCommunicationsJob } from '../../jobs/sync-communications.job'

class TriggerSyncDto {
  @IsOptional()
  @IsDateString()
  date?: string
}

@Controller('sync')
export class SyncController {
  private readonly logger = new Logger(SyncController.name)

  constructor(private readonly syncJob: SyncCommunicationsJob) {}

  @Post('trigger')
  trigger(@Body() body: TriggerSyncDto) {
    const date = body.date ?? addCalendarDaysYmd(brazilTodayYmd(), -1)

    this.syncJob.syncForDate(date, true).catch((err: Error) => {
      this.logger.error(`Erro no sync manual para ${date}: ${err.message}`)
    })

    return {
      success: true,
      date,
      message: `Sincronização iniciada para ${date}`,
    }
  }
}
