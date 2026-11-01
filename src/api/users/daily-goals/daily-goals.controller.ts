import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { DailyGoal } from '../../../domains/game/users/daily-goals/daily-goal.js';
import { DailyGoalRepository } from '../../../domains/game/users/daily-goals/daily-goal.repository.js';
import { Day } from '../../../domains/game/day/day.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../foundation/auth/authenticated-user.js';
import type { components } from '../../../foundation/contract/openapi.js';
import { parseField } from '../../../foundation/problem/parse-field.js';
import { BadRequest } from '../../../foundation/problem/problems/bad-request.js';
import { Conflict } from '../../../foundation/problem/problems/conflict.js';
import { NotFound } from '../../../foundation/problem/problems/not-found.js';

type DailyGoalBody = components['schemas']['DailyGoal'];
type DailyGoalCreateBody = components['schemas']['DailyGoalCreate'];

@Controller('users/me/dailyGoals')
export class DailyGoalsController {
  constructor(private readonly goals: DailyGoalRepository) {}

  /** listDailyGoals: the goal of one day with `on`, else every version. */
  @Get()
  async list(
    @CurrentUser() caller: AuthenticatedUser,
    @Query('on') on?: string,
  ): Promise<{ items: DailyGoalBody[] }> {
    const history = await this.goals.history(caller.id);
    if (on === undefined) return { items: history.all.map(toBody) };
    const day = parseField('/query/on', () => Day.parse(on));
    return { items: [toBody(history.on(day))] };
  }

  /** getDailyGoal: the version starting on that day. */
  @Get(':startOn')
  async get(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('startOn') startOn: string,
  ): Promise<DailyGoalBody> {
    const day = parseField('/params/startOn', () => Day.parse(startOn));
    const goal = (await this.goals.history(caller.id)).startingOn(day);
    if (!goal) throw new NotFound('no goal starts on that day');
    return toBody(goal);
  }

  /** createDailyGoal: from tomorrow at the earliest (M-11). */
  @Post()
  async create(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() body: DailyGoalCreateBody,
    @Res({ passthrough: true }) response: Response,
  ): Promise<DailyGoalBody> {
    const startOn = parseField('/body/startOn', () => Day.parse(body.startOn));
    if (!DailyGoal.canStartOn(startOn, Day.of(new Date())))
      throw new BadRequest([
        {
          field: '/body/startOn',
          message: 'a new goal starts tomorrow at the earliest',
        },
      ]);
    const result = await this.goals.create(caller.id, startOn, body.minutes);
    if (result === 'duplicate') throw new Conflict('duplicate-start-on');
    response.status(201).location(`/users/me/dailyGoals/${startOn.toString()}`);
    return toBody(result);
  }
}

function toBody(goal: DailyGoal): DailyGoalBody {
  return { startOn: goal.startOn?.toString() ?? null, minutes: goal.minutes };
}
