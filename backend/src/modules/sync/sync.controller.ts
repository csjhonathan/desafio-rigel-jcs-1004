import { Body, Controller, Get, Logger, Post } from '@nestjs/common'
import { IsDateString, IsOptional } from 'class-validator'
import { addCalendarDaysYmd, brazilTodayYmd } from '../../common/brazil-calendar-day'
import { SyncCommunicationsJob } from '../../jobs/sync-communications.job'
import { PrismaService } from '../../prisma/prisma.service'

class TriggerSyncDto {
  @IsOptional()
  @IsDateString()
  date?: string
}

@Controller('sync')
export class SyncController {
  private readonly logger = new Logger(SyncController.name)

  constructor(
    private readonly syncJob: SyncCommunicationsJob,
    private readonly prisma: PrismaService,
  ) {}

  @Post('trigger')
  trigger(@Body() body: TriggerSyncDto) {
    const date = body.date ?? addCalendarDaysYmd(brazilTodayYmd(), -1)

    this.syncJob.syncForDate(date).catch((err: Error) => {
      this.logger.error(`Erro no sync manual para ${date}: ${err.message}`)
    })

    return {
      success: true,
      date,
      message: `Sincronização iniciada para ${date}`,
    }
  }

  @Get('logs')
  async getLogs() {
    return this.prisma.syncLog.findMany({
      orderBy: { started_at: 'desc' },
      take: 100,
    })
  }
}
