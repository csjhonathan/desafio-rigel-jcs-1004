import { Module } from '@nestjs/common'
import { PjeApiClient } from './pje-api.client'

@Module({
  providers: [PjeApiClient],
  exports: [PjeApiClient],
})
export class PjeModule {}
