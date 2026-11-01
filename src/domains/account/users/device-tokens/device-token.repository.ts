import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../../foundation/database/database-client.js';

/** The devices that receive a user's push messages. A token is one device, so it belongs to one user at a time. */
@Injectable()
export class DeviceTokenRepository {
  constructor(private readonly database: DatabaseClient) {}

  /** Idempotent. A token registered by another user moves to this one (the device changed accounts). */
  async register(userId: string, token: string): Promise<void> {
    await this.database.userDeviceToken.upsert({
      where: { token },
      create: { token, userId },
      update: { userId },
    });
  }

  /** Removes the token only if it is this user's. */
  async unregister(userId: string, token: string): Promise<void> {
    await this.database.userDeviceToken.deleteMany({
      where: { token, userId },
    });
  }
}
