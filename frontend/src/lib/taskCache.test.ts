import { describe, expect, it } from 'vitest';
import {
  prependTask,
  removeTask,
  replaceTask,
  type ColumnData,
} from './taskCache';
import type { Task, TaskStatus } from './tasks';

const task = (id: string, status: TaskStatus = 'new'): Task => ({
  id,
  title: `Task ${id}`,
  description: '',
  priority: 'normal',
  status,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  statusChangedAt: '2026-01-01T00:00:00.000Z',
});

const column = (...pages: Task[][]): ColumnData => ({
  pages: pages.map((items, index) => ({
    items,
    nextCursor: index < pages.length - 1 ? `cursor-${index}` : null,
  })),
  pageParams: pages.map((_, index) =>
    index === 0 ? null : `cursor-${index - 1}`,
  ),
});

const ids = (data: ColumnData | undefined) =>
  data?.pages.map((page) => page.items.map((item) => item.id));

describe('column cache', () => {
  it('moves a task: removes it from any page of the old column and puts it first in the new one', () => {
    const b = task('b');
    const oldColumn = column([task('a'), b], [task('c')]);
    const newColumn = column(
      [task('x', 'inProgress')],
      [task('y', 'inProgress')],
    );
    const moved = { ...b, status: 'inProgress' as const };

    const oldAfter = removeTask(oldColumn, b.id);
    const newAfter = prependTask(newColumn, moved);

    expect(ids(oldAfter)).toEqual([['a'], ['c']]);
    expect(ids(newAfter)).toEqual([['b', 'x'], ['y']]);
    expect(newAfter?.pages.map((page) => page.nextCursor)).toEqual(
      newColumn.pages.map((page) => page.nextCursor),
    );
    expect(prependTask(undefined, moved)).toBeUndefined();
  });

  it('creates on top without duplicates, deletes from any page and edits in place', () => {
    const data = column([task('a'), task('b')], [task('c')]);

    expect(ids(prependTask(data, task('n')))).toEqual([['n', 'a', 'b'], ['c']]);
    expect(ids(prependTask(data, task('c')))).toEqual([['c', 'a', 'b'], []]);
    expect(ids(removeTask(data, 'c'))).toEqual([['a', 'b'], []]);

    const renamed = { ...task('b'), title: 'Renamed' };
    const edited = replaceTask(data, renamed);
    expect(ids(edited)).toEqual(ids(data));
    expect(edited?.pages[0]?.items[1]?.title).toBe('Renamed');
    expect(data.pages[0]?.items[1]?.title).toBe('Task b');
  });
});
