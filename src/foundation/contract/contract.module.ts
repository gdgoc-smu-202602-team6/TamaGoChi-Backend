import {
  DynamicModule,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import {
  CONTRACT_IGNORED_PATHS,
  ContractMiddleware,
} from './contract.middleware.js';

@Module({})
export class ContractModule implements NestModule {
  /** `ignoredPaths`: paths a library owns, which the contract does not describe. */
  static forRoot(ignoredPaths: RegExp): DynamicModule {
    return {
      module: ContractModule,
      providers: [
        { provide: CONTRACT_IGNORED_PATHS, useValue: ignoredPaths },
        ContractMiddleware,
      ],
    };
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ContractMiddleware).forRoutes('*path');
  }
}
