import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

// Importação direta para evitar problemas com NestJS DI no seed
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Usuário de demonstração
  const existing_user = await prisma.user.findUnique({ where: { email: 'demo@rigel.com' } })

  if (!existing_user) {
    const hashed = await bcrypt.hash('demo1234', 10)
    await prisma.user.create({
      data: { name: 'Demo User', email: 'demo@rigel.com', password: hashed },
    })
    console.log('✅ Usuário demo criado: demo@rigel.com / demo1234')
  } else {
    console.log('ℹ️  Usuário demo já existe')
  }

  // Seed das comunicações via job de sincronização
  // Importação dinâmica para evitar problemas de bootstrap do NestJS
  const { NestFactory } = await import('@nestjs/core')
  const { AppModule } = await import('../src/app.module')
  const { SyncCommunicationsJob } = await import('../src/jobs/sync-communications.job')

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] })
  const sync_job = app.get(SyncCommunicationsJob)

  console.log('📡 Buscando comunicações dos últimos 20 dias...')
  const result = await sync_job.syncLastDays(20)
  console.log(`✅ Seed concluído: ${result.total_synced} comunicações sincronizadas`)

  await app.close()
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
