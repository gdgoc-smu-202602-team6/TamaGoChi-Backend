import { HttpException, Inject, Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import * as OpenApiValidator from 'express-openapi-validator';
import type { ValidationError } from 'express-openapi-validator/dist/framework/types.js';
import { join } from 'node:path';
import type { Problem } from '../problem/problem.js';
import { BadRequest } from '../problem/problems/bad-request.js';
import { NotFound } from '../problem/problems/not-found.js';
import { Unauthorized } from '../problem/problems/unauthorized.js';

/** The API contract. Requests are checked against it before any route runs. */
export const contractPath = join(process.cwd(), 'openapi.yaml');

/** The injection token for the paths the contract does not describe. */
export const CONTRACT_IGNORED_PATHS = Symbol('ContractIgnoredPaths');

/** Checks each request against openapi.yaml and turns a violation into a Problem. */
@Injectable()
export class ContractMiddleware implements NestMiddleware {
  private readonly validators: RequestHandler[];

  constructor(@Inject(CONTRACT_IGNORED_PATHS) ignoredPaths: RegExp) {
    this.validators = OpenApiValidator.middleware({
      apiSpec: contractPath,
      validateRequests: { allErrors: true },
      validateResponses: false,
      ignorePaths: ignoredPaths,
    }) as RequestHandler[];
  }

  use(request: Request, response: Response, next: NextFunction): void {
    const run = (index: number): void => {
      if (index === this.validators.length) {
        next();
        return;
      }
      this.validators[index](request, response, (error?: unknown) => {
        if (error) next(toProblem(error as ValidationError));
        else run(index + 1);
      });
    };
    run(0);
  }
}

function toProblem(error: ValidationError): Problem | HttpException {
  switch (error.status) {
    case 400:
      return new BadRequest(
        error.errors.map((item) => ({ field: item.path, message: item.message })),
        error.message,
      );
    case 401:
      return new Unauthorized(error.message);
    case 404:
      return new NotFound(error.message);
    default:
      return new HttpException(error.message ?? '', error.status);
  }
}
