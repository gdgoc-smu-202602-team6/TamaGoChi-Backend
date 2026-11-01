import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { DatabaseConfig } from './database-config.js';
import { PrismaClient } from './generated/client.js';

/** The one Prisma client of the application. Each domain's repositories use only their own domain's models. */
@Injectable()
export class DatabaseClient extends PrismaClient implements OnModuleDestroy {
  constructor(config: DatabaseConfig) {
    super({ adapter: new PrismaPg({ connectionString: config.url }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
