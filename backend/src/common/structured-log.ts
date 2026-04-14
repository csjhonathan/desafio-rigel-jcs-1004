import { Logger } from '@nestjs/common'

/** Formato de saída: `json` (uma linha JSON por evento, ideal para agregadores) ou `pretty` (Nest Logger legível). */
export type LogFormat = 'json' | 'pretty'

type HttpRequestFields = {
  method: string
  path: string
  status_code: number
  duration_ms: number
}

/**
 * Log de pedido HTTP concluído (após `res.finish`).
 * Em `json`, escreve uma linha JSON em stdout (sem prefixo Nest), adequado a Railway/Datadog/etc.
 */
export function logHttpRequest(format: LogFormat, fields: HttpRequestFields): void {
  if (format === 'json') {
    const level = fields.status_code >= 400 ? 'warn' : 'log'
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        level,
        context: 'HTTP',
        event: 'http_request',
        ...fields,
      }),
    )
    return
  }

  const logger = new Logger('HTTP')
  const line = `${fields.method} ${fields.path} ${fields.status_code} ${fields.duration_ms}ms`
  if (fields.status_code >= 400) logger.warn(line)
  else logger.log(line)
}

type HttpExceptionFields = {
  method: string
  path: string
  status_code: number
  message: string
  stack?: string
}

/** Log de exceção HTTP com status ≥ 500 (corpo da resposta já foi preparado). */
export function logHttpException(format: LogFormat, fields: HttpExceptionFields): void {
  if (format === 'json') {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'error',
        context: 'AllExceptionsFilter',
        event: 'http_exception',
        ...fields,
      }),
    )
    return
  }

  const logger = new Logger('AllExceptionsFilter')
  logger.error(`${fields.method} ${fields.path} → ${fields.status_code}`, fields.stack ?? '')
}
