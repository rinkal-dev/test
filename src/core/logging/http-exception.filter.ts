/**
 * ============================================
 * HTTP EXCEPTION FILTER
 * ============================================
 * Global exception filter that logs all errors.
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Get error message
    let message = 'Internal server error';
    let stack: string | undefined;

    if (exception instanceof HttpException) {
      const errorResponse = exception.getResponse();
      message =
        typeof errorResponse === 'string'
          ? errorResponse
          : (errorResponse as any).message || exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
      stack = exception.stack;
    }

    // Log the error
    const logEntry = {
      statusCode: status,
      path: request.url,
      method: request.method,
      message,
      stack,
      ip: request.ip || request.headers['x-forwarded-for'] || 'unknown',
      userAgent: request.headers['user-agent'],
      userId: (request as any).user?.uuid || (request as any).user?.id || null,
      body: this.sanitizeBody(request.body),
      query: request.query,
      params: request.params,
      timestamp: new Date().toISOString(),
    };

    // Log based on status code
    if (status >= 500) {
      this.logger.error(message, logEntry);
    } else if (status >= 400) {
      this.logger.warn(message, logEntry);
    }

    // Send response
    response.status(status).json({
      statusCode: status,
      message: Array.isArray(message) ? message : [message],
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  /**
   * Remove sensitive data from request body before logging
   */
  private sanitizeBody(body: any): any {
    if (!body) return null;

    const sanitized = { ...body };
    const sensitiveFields = [
      'password',
      'password_confirmation',
      'current_password',
      'new_password',
      'token',
      'access_token',
      'refresh_token',
      'secret',
      'api_key',
      'credit_card',
      'cvv',
      'ssn',
    ];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
