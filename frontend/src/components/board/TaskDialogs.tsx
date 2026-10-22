"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Task } from "@/lib/tasks";
import { CreateTaskDialog } from "./CreateTaskDialog";
import { DeleteTaskDialog } from "./DeleteTaskDialog";
import { TaskDetailsDialog } from "./TaskDetailsDialog";

export type DialogView =
  | { kind: "details" }
  | { kind: "edit"; from: "column" | "details" }
  | { kind: "delete" };

interface TaskDialogs {
  openTask: (task: Task, view: DialogView) => void;
  openCreate: () => void;
}

const TaskDialogsContext = createContext<TaskDialogs | null>(null);

export function useTaskDialogs(): TaskDialogs {
  const dialogs = useContext(TaskDialogsContext);
  if (!dialogs) {
    throw new Error("useTaskDialogs must be used inside TaskDialogsProvider");
  }
  return dialogs;
}

interface DialogState {
  task: Task;
  view: DialogView;
  open: boolean;
}

export function TaskDialogsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const [creating, setCreating] = useState(false);
  const dialogs = useMemo<TaskDialogs>(
    () => ({
      openTask: (task, view) => setState({ task, view, open: true }),
      openCreate: () => setCreating(true),
    }),
    [],
  );

  const show = (view: DialogView, task?: Task) =>
    setState(
      (current) => current && { task: task ?? current.task, view, open: true },
    );
  const showDetails = (task?: Task) => show({ kind: "details" }, task);
  const close = () =>
    setState((current) => current && { ...current, open: false });
  const updateTask = (task: Task) =>
    setState((current) => current && { ...current, task });

  const view = state?.view;
  const cancelEdit = () =>
    view?.kind === "edit" && view.from === "details" ? showDetails() : close();

  return (
    <TaskDialogsContext.Provider value={dialogs}>
      {children}
      <CreateTaskDialog open={creating} onClose={() => setCreating(false)} />
      {state && (
        <>
          <TaskDetailsDialog
            task={state.task}
            open={state.open && state.view.kind !== "delete"}
            editing={state.view.kind === "edit"}
            onEdit={() => show({ kind: "edit", from: "details" })}
            onCancelEdit={cancelEdit}
            onSaved={showDetails}
            onUpdated={updateTask}
            onDelete={() => show({ kind: "delete" })}
            onClose={close}
          />
          <DeleteTaskDialog
            task={state.task}
            open={state.open && state.view.kind === "delete"}
            onClose={close}
          />
        </>
      )}
    </TaskDialogsContext.Provider>
  );
}
