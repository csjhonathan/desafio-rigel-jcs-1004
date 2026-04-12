import { Module } from '@nestjs/common'
import { JobsModule } from '../../jobs/jobs.module'
import { SyncController } from './sync.controller'

@Module({
  imports: [JobsModule],
  controllers: [SyncController],
})
export class SyncModule {}
