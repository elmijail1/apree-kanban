import { describe, expect, it } from 'vitest';
import { DESCRIPTION_MAX, TITLE_MAX, taskContentSchema } from './taskSchema';

describe('taskContentSchema', () => {
  it('trims input and enforces the same limits as the API', () => {
    const valid = (title: string, description = '') =>
      taskContentSchema.safeParse({ title, description }).success;

    expect(
      taskContentSchema.parse({ title: '  Buy milk ', description: ' 2L  ' }),
    ).toEqual({ title: 'Buy milk', description: '2L' });

    expect(valid('')).toBe(false);
    expect(valid('   ')).toBe(false);
    expect(valid('x'.repeat(TITLE_MAX))).toBe(true);
    expect(valid('x'.repeat(TITLE_MAX + 1))).toBe(false);
    expect(valid(` ${'x'.repeat(TITLE_MAX)} `)).toBe(true);

    expect(valid('Task', 'x'.repeat(DESCRIPTION_MAX))).toBe(true);
    expect(valid('Task', 'x'.repeat(DESCRIPTION_MAX + 1))).toBe(false);

    expect([TITLE_MAX, DESCRIPTION_MAX]).toEqual([60, 200]);
  });
});
