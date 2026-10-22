import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, createTask, deleteTask, updateTask } from "./api";
import {
  prependTask,
  removeTask,
  replaceTask,
  type ColumnData,
} from "./taskCache";
import type { TaskPatch } from "./taskSchema";
import type { Task, TaskStatus } from "./tasks";

const columnKey = (status: TaskStatus) => ["tasks", status];

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ task, patch }: { task: Task; patch: TaskPatch }) =>
      updateTask(task.id, patch),
    onSuccess: (updated, { task }) => {
      if (updated.status === task.status) {
        queryClient.setQueryData<ColumnData>(
          columnKey(updated.status),
          (data) => replaceTask(data, updated),
        );
        return;
      }
      queryClient.setQueryData<ColumnData>(columnKey(task.status), (data) =>
        removeTask(data, task.id),
      );
      queryClient.setQueryData<ColumnData>(columnKey(updated.status), (data) =>
        prependTask(data, updated),
      );
    },
  });
}

export function useMoveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ task, status }: { task: Task; status: TaskStatus }) =>
      updateTask(task.id, { status }),
    onMutate: async ({ task, status }) => {
      if (status === task.status) {
        return undefined;
      }
      const keys = [columnKey(task.status), columnKey(status)];
      await Promise.all(
        keys.map((queryKey) => queryClient.cancelQueries({ queryKey })),
      );
      const snapshot = keys.map(
        (queryKey) =>
          [queryKey, queryClient.getQueryData<ColumnData>(queryKey)] as const,
      );
      queryClient.setQueryData<ColumnData>(columnKey(task.status), (data) =>
        removeTask(data, task.id),
      );
      queryClient.setQueryData<ColumnData>(columnKey(status), (data) =>
        prependTask(data, {
          ...task,
          status,
          statusChangedAt: new Date().toISOString(),
        }),
      );
      return { snapshot };
    },
    onError: (_error, _variables, context) =>
      context?.snapshot.forEach(([queryKey, data]) =>
        queryClient.setQueryData(queryKey, data),
      ),
    onSuccess: (moved) =>
      queryClient.setQueryData<ColumnData>(columnKey(moved.status), (data) =>
        replaceTask(data, moved),
      ),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: (created) =>
      queryClient.setQueryData<ColumnData>(columnKey(created.status), (data) =>
        prependTask(data, created),
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
      queryClient.setQueryData<ColumnData>(columnKey(deleted.status), (data) =>
        removeTask(data, deleted.id),
      ),
  });
}
