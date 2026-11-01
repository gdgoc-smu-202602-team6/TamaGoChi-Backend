import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApplicationRepository } from '../../../domains/club/application/application.repository.js';
import { ProgressService } from '../../../domains/game/progress/progress.service.js';
import { SessionResult } from '../../../domains/game/progress/session-result.js';
import type {
  SessionState,
  StudySession,
} from '../../../domains/game/study-session/study-session.js';
import { StudySessionRepository } from '../../../domains/game/study-session/study-session.repository.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../foundation/auth/authenticated-user.js';
import type { components } from '../../../foundation/contract/openapi.js';
import { pageBody, pageRequest } from '../../../foundation/pagination/page.js';
import { Conflict } from '../../../foundation/problem/problems/conflict.js';
import { NotFound } from '../../../foundation/problem/problems/not-found.js';
import { PlayerViews } from '../player-views.js';

type SessionBody = components['schemas']['StudySession'];
type SessionPageBody = components['schemas']['StudySessionPage'];
type SessionEndBody = components['schemas']['StudySessionEnd'];

@Controller('users/me/studySessions')
export class StudySessionsController {
  constructor(
    private readonly sessions: StudySessionRepository,
    private readonly progress: ProgressService,
    private readonly players: PlayerViews,
    private readonly applications: ApplicationRepository,
  ) {}

  /** startStudySession: the server's time is the start (F-02). */
  @Post()
  async start(
    @CurrentUser() caller: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionBody> {
    const now = new Date();
    const session = await this.sessions.start(caller.id, now);
    if (session === 'running') throw new Conflict('session-running');
    response.status(201).location(`/users/me/studySessions/${session.id}`);
    return toBody(session, now);
  }

  /** listStudySessions: newest first; `state=RUNNING` finds the one running on any device (3.2). */
  @Get()
  async list(
    @CurrentUser() caller: AuthenticatedUser,
    @Query('state') state: SessionState | undefined,
    @Query('pageSize') pageSize: number,
    @Query('pageToken') pageToken?: string,
  ): Promise<SessionPageBody> {
    const now = new Date();
    const query = `studySessions:${caller.id}:${state ?? ''}`;
    const page = await this.sessions.list(
      caller.id,
      state,
      now,
      pageRequest(query, pageSize, pageToken),
      query,
    );
    return pageBody(page, (session) => toBody(session, now));
  }

  /** getStudySession: an ended one with its result, the same every time (F-37). */
  @Get(':sessionId')
  async get(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ): Promise<SessionBody> {
    const session = await this.sessions.find(caller.id, sessionId);
    if (!session) throw new NotFound('session not found');
    return this.withResult(caller, session, new Date());
  }

  /** endStudySession: the arrival, or the device's earlier time after the start, capped at 12 hours (6.3). */
  @Patch(':sessionId')
  async end(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Body() body: SessionEndBody,
  ): Promise<SessionBody> {
    const arrival = new Date();
    const clientEndedAt = body.clientEndedAt
      ? new Date(body.clientEndedAt)
      : undefined;
    const session = await this.sessions.end(caller.id, sessionId, (one) =>
      one.endTimeFor(arrival, clientEndedAt),
    );
    if (session === null) throw new NotFound('session not found');
    if (session === 'ended') throw new Conflict('session-ended');
    return this.withResult(caller, session, arrival);
  }

  private async withResult(
    caller: AuthenticatedUser,
    session: StudySession,
    now: Date,
  ): Promise<SessionBody> {
    if (session.state(now) === 'RUNNING') return toBody(session, now);
    const [me, joinedAt] = await Promise.all([
      this.players.me(caller),
      this.applications.joinedAt(caller.id),
    ]);
    const { records } = await this.progress.now(
      me.id,
      me.createdAt,
      joinedAt,
      now,
    );
    return toBody(session, now, SessionResult.of(records, session, now));
  }
}

function toBody(
  session: StudySession,
  now: Date,
  result?: SessionResult,
): SessionBody {
  const state = session.state(now);
  return {
    id: session.id,
    state,
    startedAt: session.startedAt.toISOString(),
    ...(state === 'ENDED'
      ? { endedAt: session.effectiveEnd(now).toISOString() }
      : { expectedVolts: session.paidMinutes(now) }),
    maxEndAt: session.maxEndAt.toISOString(),
    studiedSeconds: session.studiedSeconds(now),
    ...(result ? { result: toResultBody(result) } : {}),
  };
}

function toResultBody(result: SessionResult): SessionBody['result'] {
  return {
    studiedMinutes: result.studiedMinutes,
    volts: result.volts,
    xp: result.xp,
    attendanceBonusXp: result.attendanceBonusXp,
    goalBonusXp: result.goalBonusXp,
    attendedNow: result.attendedNow,
    bugsCleared: result.bugsCleared,
    bugsRemaining: result.bugsRemaining,
    heartsChange: result.heartsChange,
    levelBefore: result.levelBefore,
    levelAfter: result.levelAfter,
  };
}
