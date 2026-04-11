import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  })

  app.setGlobalPrefix('api/v1')

  const swagger_config = new DocumentBuilder()
    .setTitle('Rigel JCS API')
    .setDescription('API de comunicações processuais do DJE')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, swagger_config)
  SwaggerModule.setup('api/docs', app, document)

  const port = process.env.BACKEND_PORT ?? 3001
  await app.listen(port)
  console.log(`🚀 Backend rodando em http://localhost:${port}/api/v1`)
  console.log(`📚 Swagger: http://localhost:${port}/api/docs`)
}

bootstrap()
