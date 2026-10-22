import type { InfiniteData } from '@tanstack/react-query';
import type { Task, TaskPage } from './tasks';

export type ColumnData = InfiniteData<TaskPage, string | null>;

function mapItems(
  data: ColumnData | undefined,
  update: (items: Task[], pageIndex: number) => Task[],
): ColumnData | undefined {
  return (
    data && {
      ...data,
      pages: data.pages.map((page, index) => ({
        ...page,
        items: update(page.items, index),
      })),
    }
  );
}

export function removeTask(
  data: ColumnData | undefined,
  id: string,
): ColumnData | undefined {
  return mapItems(data, (items) => items.filter((task) => task.id !== id));
}

export function replaceTask(
  data: ColumnData | undefined,
  task: Task,
): ColumnData | undefined {
  return mapItems(data, (items) =>
    items.map((item) => (item.id === task.id ? task : item)),
  );
}

export function prependTask(
  data: ColumnData | undefined,
  task: Task,
): ColumnData | undefined {
  return mapItems(removeTask(data, task.id), (items, pageIndex) =>
    pageIndex === 0 ? [task, ...items] : items,
  );
}
