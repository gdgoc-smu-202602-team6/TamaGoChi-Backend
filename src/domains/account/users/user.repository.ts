import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../foundation/database/database-client.js';
import { asId, type Id } from '../../../foundation/id/id.js';
import { Nickname } from './nickname.js';
import { User } from './user.js';

const userColumns = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
} as const;

@Injectable()
export class UserRepository {
  constructor(private readonly database: DatabaseClient) {}

  async find(id: Id<'User'>): Promise<User | null> {
    const row = await this.database.user.findUnique({
      where: { id },
      select: userColumns,
    });
    return row ? toUser(row) : null;
  }

  /** The users that exist among `ids`, keyed by id. */
  async findMany(ids: readonly Id<'User'>[]): Promise<Map<Id<'User'>, User>> {
    const rows = await this.database.user.findMany({
      where: { id: { in: [...ids] } },
      select: userColumns,
    });
    return new Map(rows.map((row) => [asId<'User'>(row.id), toUser(row)]));
  }

  /** Null when the user does not exist. */
  async rename(id: Id<'User'>, nickname: Nickname): Promise<User | null> {
    const { count } = await this.database.user.updateMany({
      where: { id },
      data: { name: nickname.value, updatedAt: new Date() },
    });
    return count === 0 ? null : this.find(id);
  }

  /**
   * Deletes the account. Foreign keys cascade to its sessions, linked accounts, device tokens, applications,
   * memberships and game data; notices and guestbook entries it wrote stay, with no author.
   */
  async delete(id: Id<'User'>): Promise<boolean> {
    const { count } = await this.database.user.deleteMany({ where: { id } });
    return count > 0;
  }
}

function toUser(row: {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}): User {
  return new User(
    asId<'User'>(row.id),
    row.email,
    Nickname.fromStored(row.name),
    row.createdAt,
  );
}
