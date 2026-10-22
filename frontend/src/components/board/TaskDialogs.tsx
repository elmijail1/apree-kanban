"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { Task } from "@/lib/tasks";
import { DeleteTaskDialog } from "./DeleteTaskDialog";
import { TaskDetailsDialog } from "./TaskDetailsDialog";

export type DialogView =
  | { kind: "details" }
  | { kind: "edit"; from: "column" | "details" }
  | { kind: "delete" };

type OpenTask = (task: Task, view: DialogView) => void;

const OpenTaskContext = createContext<OpenTask | null>(null);

export function useOpenTask(): OpenTask {
  const openTask = useContext(OpenTaskContext);
  if (!openTask) {
    throw new Error("useOpenTask must be used inside TaskDialogsProvider");
  }
  return openTask;
}

interface DialogState {
  task: Task;
  view: DialogView;
  open: boolean;
}

export function TaskDialogsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const openTask = useCallback<OpenTask>(
    (task, view) => setState({ task, view, open: true }),
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
    <OpenTaskContext.Provider value={openTask}>
      {children}
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
    </OpenTaskContext.Provider>
  );
}
