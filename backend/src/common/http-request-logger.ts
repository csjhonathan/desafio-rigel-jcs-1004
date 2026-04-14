import { INestApplication } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { type LogFormat, logHttpRequest } from './structured-log'

/**
 * Regista cada pedido HTTP (método, URL, status, duração) quando a resposta termina.
 * O formato vem de `LOG_FORMAT` (ver `structured-log.ts`).
 */
export function registerHttpRequestLogging(app: INestApplication, format: LogFormat): void {
  const server = app.getHttpAdapter().getInstance() as {
    use: (fn: (req: Request, res: Response, next: NextFunction) => void) => void
  }

  server.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now()
    const path = req.originalUrl ?? req.url

    res.on('finish', () => {
      const duration_ms = Date.now() - start
      logHttpRequest(format, {
        method: req.method,
        path,
        status_code: res.statusCode,
        duration_ms,
      })
    })

    next()
  })
}
