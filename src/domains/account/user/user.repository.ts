import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../foundation/database/database-client.js';
import { Nickname } from './nickname.js';
import { User } from './user.js';

@Injectable()
export class UserRepository {
  constructor(private readonly database: DatabaseClient) {}

  async find(id: string): Promise<User | null> {
    const row = await this.database.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });
    return row ? new User(row.id, row.email, Nickname.fromStored(row.name)) : null;
  }
}
