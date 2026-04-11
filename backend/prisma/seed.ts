import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const PJE_LAST_DAYS_TO_SYNC = Number(process.env.PJE_LAST_DAYS_TO_SYNC ?? 20)
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

  const existing_communications = await prisma.communication.count()
  
  if (!existing_communications) {
    // Seed das comunicações via job de sincronização
    // Importação dinâmica para evitar problemas de bootstrap do NestJS
    const { NestFactory } = await import('@nestjs/core')
    const { AppModule } = await import('../src/app.module')
    const { SyncCommunicationsJob } = await import('../src/jobs/sync-communications.job')

    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    })
    const sync_job = app.get(SyncCommunicationsJob)

    const result = await sync_job.syncLastDays(PJE_LAST_DAYS_TO_SYNC)
    console.log(`✅ Seed concluído: ${result.total_synced} comunicações sincronizadas`)
    await app.close()

  } else {
    console.log(`ℹ️  ${existing_communications} comunicações já existem`)
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
