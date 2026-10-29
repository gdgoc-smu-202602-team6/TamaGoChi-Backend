import { Controller, Get } from '@nestjs/common';
import { UserRepository } from '../../domains/account/user/user.repository.js';
import { CurrentUser, type AuthenticatedUser } from '../../foundation/auth/authenticated-user.js';
import type { components } from '../../foundation/contract/openapi.js';
import { NotFound } from '../../foundation/problem/problems/not-found.js';

type UserBody = components['schemas']['User'];

@Controller('users')
export class UsersController {
  constructor(private readonly users: UserRepository) {}

  /** getMe */
  @Get('me')
  async getMe(@CurrentUser() caller: AuthenticatedUser): Promise<UserBody> {
    const user = await this.users.find(caller.id);
    if (!user) throw new NotFound('user not found');
    return { id: user.id, email: user.email, nickname: user.nickname.value };
  }
}
