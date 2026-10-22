import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

export interface TaskCursor {
  statusChangedAt: Date;
  id: string;
}

const cursorPayloadSchema = z.object({
  t: z.iso.datetime(),
  id: z.uuid(),
});

export function encodeCursor(cursor: TaskCursor): string {
  const payload = { t: cursor.statusChangedAt.toISOString(), id: cursor.id };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCursor(raw: string): TaskCursor {
  try {
    const json: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString());
    const payload = cursorPayloadSchema.parse(json);
    return { statusChangedAt: new Date(payload.t), id: payload.id };
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
}
