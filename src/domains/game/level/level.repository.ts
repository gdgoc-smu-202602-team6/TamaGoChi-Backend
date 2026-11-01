import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../foundation/database/database-client.js';

/** The highest level each user has reached (merged 6.4: a changed level table never lowers a level). */
@Injectable()
export class LevelRepository {
  constructor(private readonly database: DatabaseClient) {}

  /** Records `level` if it is higher than the one reached, and returns the level reached. */
  async reach(userId: string, level: number): Promise<number> {
    await this.database.$executeRaw`
      INSERT INTO user_levels (user_id, level) VALUES (${userId}, ${level})
      ON CONFLICT (user_id) DO UPDATE SET level = GREATEST(user_levels.level, EXCLUDED.level)`;
    const row = await this.database.userLevel.findUniqueOrThrow({
      where: { userId },
      select: { level: true },
    });
    return row.level;
  }
}
