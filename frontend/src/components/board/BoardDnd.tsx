'use client';

import { useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { useMoveTask } from '@/lib/taskMutations';
import { STATUS_LABELS, type Task, type TaskStatus } from '@/lib/tasks';
import { theme } from '@/theme';
import { TaskCardView, type DraggedTask } from './TaskCard';

const DESKTOP_QUERY = `(min-width: ${theme.breakpoints.values.md}px) and (hover: hover) and (pointer: fine)`;

class DesktopMouseSensor extends MouseSensor {
  static activators: typeof MouseSensor.activators = MouseSensor.activators.map(
    (activator) => ({
      ...activator,
      handler: (event, options) =>
        window.matchMedia(DESKTOP_QUERY).matches &&
        activator.handler(event, options),
    }),
  );
}

const taskOf = (data: unknown) => (data as DraggedTask | undefined)?.task;

const announcements: Announcements = {
  onDragStart: ({ active }) =>
    `Задача «${taskOf(active.data.current)?.title ?? ''}» взята`,
  onDragOver: ({ over }) =>
    over ? `Над колонкой «${STATUS_LABELS[over.id as TaskStatus]}»` : undefined,
  onDragEnd: ({ over }) =>
    over
      ? `Задача перемещена в колонку «${STATUS_LABELS[over.id as TaskStatus]}»`
      : 'Перемещение отменено',
  onDragCancel: () => 'Перемещение отменено',
};

export function BoardDnd({ children }: { children: ReactNode }) {
  const sensors = useSensors(
    useSensor(DesktopMouseSensor, { activationConstraint: { distance: 5 } }),
  );

  const [dragged, setDragged] = useState<Task | null>(null);
  const move = useMoveTask();

  const handleDragStart = ({ active }: DragStartEvent) =>
    setDragged(taskOf(active.data.current) ?? null);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDragged(null);
    const task = taskOf(active.data.current);
    const status = over?.id as TaskStatus | undefined;
    if (task && status && status !== task.status) {
      move.mutate({ task, status });
    }
  };

  return (
    <DndContext
      id="board-dnd"
      sensors={sensors}
      collisionDetection={pointerWithin}
      accessibility={{ announcements }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragged(null)}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {dragged && <TaskCardView task={dragged} lifted />}
      </DragOverlay>
      <Snackbar
        open={move.isError}
        autoHideDuration={5000}
        onClose={() => move.reset()}
      >
        <Alert severity="error" variant="filled" onClose={() => move.reset()}>
          Не удалось переместить задачу
        </Alert>
      </Snackbar>
    </DndContext>
  );
}
