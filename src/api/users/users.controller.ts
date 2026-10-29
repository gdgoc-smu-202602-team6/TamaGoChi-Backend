import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Put,
} from '@nestjs/common';
import { DeviceTokenRepository } from '../../domains/account/device-token/device-token.repository.js';
import { Nickname } from '../../domains/account/user/nickname.js';
import type { User } from '../../domains/account/user/user.js';
import { UserRepository } from '../../domains/account/user/user.repository.js';
import { MemberRepository } from '../../domains/club/member/member.repository.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../foundation/auth/authenticated-user.js';
import type { components } from '../../foundation/contract/openapi.js';
import { parseField } from '../../foundation/problem/parse-field.js';
import { Conflict } from '../../foundation/problem/problems/conflict.js';
import { NotFound } from '../../foundation/problem/problems/not-found.js';

type UserBody = components['schemas']['User'];
type UserUpdateBody = components['schemas']['UserUpdate'];

@Controller('users/me')
export class UsersController {
  constructor(
    private readonly users: UserRepository,
    private readonly deviceTokens: DeviceTokenRepository,
    private readonly members: MemberRepository,
  ) {}

  /** getMe */
  @Get()
  async getMe(@CurrentUser() caller: AuthenticatedUser): Promise<UserBody> {
    return toBody(found(await this.users.find(caller.id)));
  }

  /** updateMe */
  @Patch()
  async updateMe(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() body: UserUpdateBody,
  ): Promise<UserBody> {
    const input = body.nickname;
    if (input === undefined) return this.getMe(caller);
    const nickname = parseField('/body/nickname', () => Nickname.parse(input));
    return toBody(found(await this.users.rename(caller.id, nickname)));
  }

  /** deleteMe */
  @Delete()
  @HttpCode(204)
  async deleteMe(@CurrentUser() caller: AuthenticatedUser): Promise<void> {
    if (await this.members.isLastManagerSomewhere(caller.id)) {
      throw new Conflict('last-manager');
    }
    if (!(await this.users.delete(caller.id)))
      throw new NotFound('user not found');
  }

  /** putDeviceToken */
  @Put('deviceTokens/:token')
  @HttpCode(204)
  async putDeviceToken(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('token') token: string,
  ): Promise<void> {
    await this.deviceTokens.register(caller.id, token);
  }

  /** deleteDeviceToken */
  @Delete('deviceTokens/:token')
  @HttpCode(204)
  async deleteDeviceToken(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('token') token: string,
  ): Promise<void> {
    await this.deviceTokens.unregister(caller.id, token);
  }
}

function found(user: User | null): User {
  if (!user) throw new NotFound('user not found');
  return user;
}

function toBody(user: User): UserBody {
  return { id: user.id, email: user.email, nickname: user.nickname.value };
}
