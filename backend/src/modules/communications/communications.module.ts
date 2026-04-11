import { Module } from '@nestjs/common'
import { AiModule } from '../ai/ai.module'
import { CommunicationsController } from './communications.controller'
import { CommunicationsRepository } from './communications.repository'
import { CommunicationsService } from './communications.service'

@Module({
  imports: [AiModule],
  controllers: [CommunicationsController],
  providers: [CommunicationsService, CommunicationsRepository],
  exports: [CommunicationsService, CommunicationsRepository],
})
export class CommunicationsModule {}
