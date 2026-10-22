import { BadRequestException } from '@nestjs/common';
import { decodeCursor, encodeCursor } from './task-cursor.js';

const toBase64Url = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

describe('task cursor', () => {
  const cursor = {
    statusChangedAt: new Date('2026-10-22T15:23:48.437Z'),
    id: '0199f3a2-7c1e-7d4a-9b2f-3e5c8a1d6f40',
  };

  it('round-trips statusChangedAt to the millisecond and the id', () => {
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it('is URL-safe, so it can go into a query string as is', () => {
    expect(encodeCursor(cursor)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('is different for tasks with the same statusChangedAt', () => {
    const sibling = { ...cursor, id: '0199f3a2-7c1e-7d4a-9b2f-3e5c8a1d6f41' };
    expect(encodeCursor(sibling)).not.toBe(encodeCursor(cursor));
  });

  it.each([
    ['garbage', 'xyz'],
    ['not JSON', Buffer.from('hello').toString('base64url')],
    ['missing id', toBase64Url({ t: '2026-10-22T15:23:48.437Z' })],
    ['missing timestamp', toBase64Url({ id: cursor.id })],
    ['invalid timestamp', toBase64Url({ t: 'yesterday', id: cursor.id })],
    ['invalid id', toBase64Url({ t: '2026-10-22T15:23:48.437Z', id: '42' })],
  ])('rejects a cursor with %s as 400', (_, raw) => {
    expect(() => decodeCursor(raw)).toThrow(BadRequestException);
  });
});
