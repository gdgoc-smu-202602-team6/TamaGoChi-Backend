import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../foundation/database/database-client.js';
import { Nickname } from './nickname.js';
import { User } from './user.js';

const userColumns = { id: true, email: true, name: true } as const;

@Injectable()
export class UserRepository {
  constructor(private readonly database: DatabaseClient) {}

  async find(id: string): Promise<User | null> {
    const row = await this.database.user.findUnique({
      where: { id },
      select: userColumns,
    });
    return row ? toUser(row) : null;
  }

  /** The users that exist among `ids`, keyed by id. */
  async findMany(ids: readonly string[]): Promise<Map<string, User>> {
    const rows = await this.database.user.findMany({
      where: { id: { in: [...ids] } },
      select: userColumns,
    });
    return new Map(rows.map((row) => [row.id, toUser(row)]));
  }

  /** Null when the user does not exist. */
  async rename(id: string, nickname: Nickname): Promise<User | null> {
    const { count } = await this.database.user.updateMany({
      where: { id },
      data: { name: nickname.value, updatedAt: new Date() },
    });
    return count === 0 ? null : this.find(id);
  }

  /**
   * Deletes the account. Foreign keys cascade to its sessions, linked accounts, device tokens, applications and
   * memberships (and each membership's game data); notices it wrote keep their text with no author.
   */
  async delete(id: string): Promise<boolean> {
    const { count } = await this.database.user.deleteMany({ where: { id } });
    return count > 0;
  }
}

function toUser(row: { id: string; email: string; name: string }): User {
  return new User(row.id, row.email, Nickname.fromStored(row.name));
}
