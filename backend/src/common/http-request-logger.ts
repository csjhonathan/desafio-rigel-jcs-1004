import { INestApplication, Logger } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

/**
 * Regista cada pedido HTTP (método, URL, status, duração) quando a resposta termina.
 * Útil para ver tráfego do frontend e do Swagger no mesmo sítio dos logs Nest.
 */
export function registerHttpRequestLogging(app: INestApplication): void {
  const logger = new Logger('HTTP')
  const server = app.getHttpAdapter().getInstance() as {
    use: (fn: (req: Request, res: Response, next: NextFunction) => void) => void
  }

  server.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now()
    const path = req.originalUrl ?? req.url

    res.on('finish', () => {
      const ms = Date.now() - start
      const line = `${req.method} ${path} ${res.statusCode} ${ms}ms`
      if (res.statusCode >= 400) logger.warn(line)
      else logger.log(line)
    })

    next()
  })
}
