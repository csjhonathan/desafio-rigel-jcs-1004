import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { SyncCommunicationsJob } from '../src/jobs/sync-communications.job'

async function main() {
  console.log('🔄 Iniciando sync diário (ontem)...')

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  })

  const sync_job = app.get(SyncCommunicationsJob)
  const result = await sync_job.syncForYesterday()

  console.log(`✅ Sync concluído: ${result.total_synced} comunicações sincronizadas`)

  await app.close()
}

main().catch((e) => {
  console.error('❌ Erro no sync:', e)
  process.exit(1)
})
