import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Label } from '../../../domains/club/label/label.js';
import type { Part } from '../../../domains/club/part/part.js';
import { PartRepository } from '../../../domains/club/part/part.repository.js';
import { RequireClubAccess } from '../../../foundation/access/club-access.guard.js';
import type { components } from '../../../foundation/contract/openapi.js';
import { parseField } from '../../../foundation/problem/parse-field.js';
import { Conflict } from '../../../foundation/problem/problems/conflict.js';
import { NotFound } from '../../../foundation/problem/problems/not-found.js';

type PartBody = components['schemas']['Part'];
type PartCreateBody = components['schemas']['PartCreate'];

@Controller('clubs/:clubId/parts')
export class PartsController {
  constructor(private readonly parts: PartRepository) {}

  /** listParts. Signed-in users who are not members yet read it to apply. */
  @Get()
  async list(@Param('clubId') clubId: string): Promise<{ items: PartBody[] }> {
    const parts = await this.parts.list(clubId);
    if (!parts) throw new NotFound('club not found');
    return { items: parts.map(toBody) };
  }

  /** createPart */
  @Post()
  @RequireClubAccess('parts.manage')
  async create(
    @Param('clubId') clubId: string,
    @Body() body: PartCreateBody,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PartBody> {
    const name = parseField('/body/name', () => Label.parse(body.name));
    const part = await this.parts.create(clubId, name, body.color);
    if (part === 'duplicate') throw new Conflict('duplicate-name');
    response.status(201).location(`/clubs/${clubId}/parts/${part.id}`);
    return toBody(part);
  }

  /** deletePart */
  @Delete(':partId')
  @RequireClubAccess('parts.manage')
  @HttpCode(204)
  async delete(
    @Param('clubId') clubId: string,
    @Param('partId') partId: string,
  ): Promise<void> {
    const result = await this.parts.delete(clubId, partId);
    if (result === null) throw new NotFound('part not found');
    if (result === 'in-use') throw new Conflict('in-use');
  }
}

function toBody(part: Part): PartBody {
  return { id: part.id, name: part.name.value, color: part.color };
}
