import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { ApiError, deleteTask, updateTask, updateTaskStatus } from "./api";
import type { TaskPatch } from "./taskSchema";
import type { Task, TaskPage, TaskStatus } from "./tasks";

type ColumnData = InfiniteData<TaskPage, string | null>;

function updateColumnItems(
  queryClient: QueryClient,
  status: TaskStatus,
  update: (items: Task[]) => Task[],
) {
  queryClient.setQueryData<ColumnData>(
    ["tasks", status],
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: update(page.items),
        })),
      },
  );
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TaskPatch }) =>
      updateTask(id, patch),
    onSuccess: (updated) =>
      updateColumnItems(queryClient, updated.status, (items) =>
        items.map((task) => (task.id === updated.id ? updated : task)),
      ),
  });
}

export function useMoveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ task, status }: { task: Task; status: TaskStatus }) =>
      updateTaskStatus(task.id, status),
    onSuccess: (moved, { task }) => {
      if (moved.status === task.status) {
        return;
      }
      updateColumnItems(queryClient, task.status, (items) =>
        items.filter((item) => item.id !== moved.id),
      );
      queryClient.setQueryData<ColumnData>(
        ["tasks", moved.status],
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page, index) =>
              index === 0 ? { ...page, items: [moved, ...page.items] } : page,
            ),
          },
      );
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (task: Task) => {
      try {
        await deleteTask(task.id);
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) {
          throw error;
        }
      }
    },
    onSuccess: (_, deleted) =>
      updateColumnItems(queryClient, deleted.status, (items) =>
        items.filter((task) => task.id !== deleted.id),
      ),
  });
}
