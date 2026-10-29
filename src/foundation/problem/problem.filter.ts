import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { STATUS_CODES } from 'node:http';
import { Problem } from './problem.js';

const contentType = 'application/problem+json';

/** The one place that turns errors into RFC 9457 responses. */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemFilter.name);

  constructor(private readonly exposeInternalErrors: boolean) {}

  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (error instanceof Problem) {
      response
        .status(error.status)
        .set({ ...error.headers(), 'Content-Type': contentType })
        .send(
          JSON.stringify({
            type: error.type,
            title: error.title,
            status: error.status,
            detail: error.message,
            ...error.extensions(),
          }),
        );
      return;
    }

    if (error instanceof HttpException) {
      const status = error.getStatus();
      response
        .status(status)
        .set('Content-Type', contentType)
        .send(JSON.stringify({ type: 'about:blank', title: STATUS_CODES[status], status, detail: error.message }));
      return;
    }

    this.logger.error(error);
    const detail = this.exposeInternalErrors && error instanceof Error ? error.stack : undefined;
    response
      .status(500)
      .set('Content-Type', contentType)
      .send(JSON.stringify({ type: 'about:blank', title: STATUS_CODES[500], status: 500, detail }));
  }
}
