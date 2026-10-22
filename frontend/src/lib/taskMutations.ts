import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { ApiError, deleteTask, updateTask } from "./api";
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
