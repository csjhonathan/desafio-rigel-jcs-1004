import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Request, Response } from 'express'
import type { LogFormat } from '../structured-log'
import { logHttpException } from '../structured-log'

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly config: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    const raw_message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Erro interno no servidor'

    const message =
      typeof raw_message === 'string' ? raw_message : JSON.stringify(raw_message)

    if (status >= 500) {
      const format = this.config.get<LogFormat>('LOG_FORMAT') ?? 'pretty'
      logHttpException(format, {
        method: request.method,
        path: request.url,
        status_code: status,
        message,
        stack: exception instanceof Error ? exception.stack : undefined,
      })
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: raw_message,
    })
  }
}
