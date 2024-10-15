import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception.message || 'Internal server error';

    response.status(status).json({
      status: 'error',
      message,
      error:
        status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Server error'
          : exception.response,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
