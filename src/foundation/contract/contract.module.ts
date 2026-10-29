import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ContractMiddleware } from './contract.middleware.js';

@Module({})
export class ContractModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ContractMiddleware).forRoutes('*path');
  }
}
