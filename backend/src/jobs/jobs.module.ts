import { Module } from '@nestjs/common'
import { CommunicationsModule } from '../modules/communications/communications.module'
import { PjeModule } from '../pje/pje.module'
import { SyncCommunicationsJob } from './sync-communications.job'

@Module({
  imports: [CommunicationsModule, PjeModule],
  providers: [SyncCommunicationsJob],
  exports: [SyncCommunicationsJob],
})
export class JobsModule {}
