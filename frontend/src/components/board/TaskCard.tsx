'use client';

import type { Ref } from 'react';
import { useDraggable, type DraggableSyntheticListeners } from '@dnd-kit/core';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ButtonBase from '@mui/material/ButtonBase';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Task } from '@/lib/tasks';
import { PriorityChip } from './PriorityChip';
import { useTaskDialogs } from './TaskDialogs';

export interface DraggedTask {
  task: Task;
}

export function TaskCard({ task }: { task: Task }) {
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: task.id,
    data: { task } satisfies DraggedTask,
  });

  return (
    <TaskCardView
      task={task}
      ref={setNodeRef}
      listeners={listeners}
      dimmed={isDragging}
    />
  );
}

interface TaskCardViewProps {
  task: Task;
  ref?: Ref<HTMLDivElement>;
  listeners?: DraggableSyntheticListeners;
  dimmed?: boolean;
  lifted?: boolean;
}

export function TaskCardView({
  task,
  ref,
  listeners,
  dimmed = false,
  lifted = false,
}: TaskCardViewProps) {
  const { openTask } = useTaskDialogs();

  return (
    <Card
      ref={ref}
      {...listeners}
      component="article"
      variant={lifted ? 'elevation' : 'outlined'}
      elevation={lifted ? 8 : 0}
      sx={{
        position: 'relative',
        p: 1.5,
        cursor: lifted ? 'grabbing' : 'pointer',
        opacity: dimmed ? 0.4 : 1,
        transition: (theme) =>
          theme.transitions.create('background-color', {
            duration: theme.transitions.duration.shortest,
          }),
        '&:hover': { bgcolor: 'grey.100' },
        '&:has(:focus-visible)': {
          outline: (theme) => `2px solid ${theme.palette.primary.main}`,
          outlineOffset: '-2px',
        },
      }}
    >
      <ButtonBase
        disableRipple
        onClick={() => openTask(task, { kind: 'details' })}
        sx={{
          position: 'static',
          display: 'block',
          textAlign: 'left',
          '&::after': { content: '""', position: 'absolute', inset: 0 },
        }}
      >
        <Typography
          variant="subtitle1"
          component="h3"
          sx={{ fontWeight: 500, lineHeight: 1.3, overflowWrap: 'anywhere' }}
        >
          {task.title}
        </Typography>
      </ButtonBase>

      <Stack
        direction="row"
        sx={{ mt: 1, alignItems: 'center', justifyContent: 'space-between' }}
      >
        <PriorityChip priority={task.priority} />
        <Stack direction="row" sx={{ position: 'relative', zIndex: 1 }}>
          <IconButton
            size="small"
            aria-label="Редактировать"
            onClick={() => openTask(task, { kind: 'edit', from: 'column' })}
          >
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            aria-label="Удалить"
            onClick={() => openTask(task, { kind: 'delete' })}
          >
            <DeleteOutlinedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
    </Card>
  );
}
