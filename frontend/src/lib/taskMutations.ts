import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import {
  ApiError,
  createTask,
  deleteTask,
  updateTask,
  updateTaskStatus,
} from "./api";
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

function prependToColumn(queryClient: QueryClient, task: Task) {
  queryClient.setQueryData<ColumnData>(
    ["tasks", task.status],
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((page, index) =>
          index === 0 ? { ...page, items: [task, ...page.items] } : page,
        ),
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
    onMutate: async ({ task, status }) => {
      if (status === task.status) {
        return undefined;
      }
      const keys = [
        ["tasks", task.status],
        ["tasks", status],
      ];
      await Promise.all(
        keys.map((queryKey) => queryClient.cancelQueries({ queryKey })),
      );
      const snapshot = keys.map(
        (queryKey) =>
          [queryKey, queryClient.getQueryData<ColumnData>(queryKey)] as const,
      );
      updateColumnItems(queryClient, task.status, (items) =>
        items.filter((item) => item.id !== task.id),
      );
      prependToColumn(queryClient, {
        ...task,
        status,
        statusChangedAt: new Date().toISOString(),
      });
      return { snapshot };
    },
    onError: (_error, _variables, context) =>
      context?.snapshot.forEach(([queryKey, data]) =>
        queryClient.setQueryData(queryKey, data),
      ),
    onSuccess: (moved) =>
      updateColumnItems(queryClient, moved.status, (items) =>
        items.map((item) => (item.id === moved.id ? moved : item)),
      ),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: (created) => prependToColumn(queryClient, created),
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
