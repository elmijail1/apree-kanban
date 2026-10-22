'use client';

import { useState, type SubmitEvent } from 'react';
import { z } from 'zod';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { amber } from '@mui/material/colors';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useMoveTask, useUpdateTask } from '@/lib/taskMutations';
import { taskContentSchema, type TaskPatch } from '@/lib/taskSchema';
import {
  STATUS_LABELS,
  TASK_STATUSES,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from '@/lib/tasks';
import { ChipPicker } from './ChipPicker';
import {
  DescriptionField,
  Field,
  PriorityPicker,
  TitleField,
} from './TaskFormFields';

const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'long',
  timeStyle: 'short',
});

interface TaskDetailsDialogProps {
  task: Task;
  open: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaved: (task: Task) => void;
  onUpdated: (task: Task) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function TaskDetailsDialog(props: TaskDetailsDialogProps) {
  const { open, editing, onCancelEdit, onClose } = props;
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const handleClose = (
    _: unknown,
    reason: 'backdropClick' | 'escapeKeyDown',
  ) => {
    if (editing && reason === 'escapeKeyDown') {
      onCancelEdit();
    } else {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
      slotProps={{
        paper: { sx: editing ? { bgcolor: amber[50] } : undefined },
      }}
    >
      <DetailsContent key={editing ? 'edit' : 'view'} {...props} />
    </Dialog>
  );
}

function DetailsContent({
  task,
  editing,
  onEdit,
  onCancelEdit,
  onSaved,
  onUpdated,
  onDelete,
  onClose,
}: TaskDetailsDialogProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.status);
  const update = useUpdateTask();
  const move = useMoveTask();
  const saving = update.isPending || move.isPending;

  const pendingPriority = update.isPending
    ? update.variables.patch.priority
    : undefined;
  const shownPriority = editing ? priority : (pendingPriority ?? task.priority);
  const changePriority = (next: TaskPriority) =>
    editing
      ? setPriority(next)
      : update.mutate(
          { task, patch: { priority: next } },
          { onSuccess: onUpdated },
        );

  const pendingStatus = move.isPending ? move.variables.status : undefined;
  const shownStatus = editing ? status : (pendingStatus ?? task.status);
  const changeStatus = (next: TaskStatus) =>
    editing
      ? setStatus(next)
      : move.mutate({ task, status: next }, { onSuccess: onUpdated });

  const parsed = taskContentSchema.safeParse({ title, description });
  const errors = parsed.success ? {} : z.flattenError(parsed.error).fieldErrors;

  const handleSave = (event: SubmitEvent) => {
    event.preventDefault();
    if (!parsed.success || saving) {
      return;
    }
    const patch: TaskPatch = {};
    if (parsed.data.title !== task.title) {
      patch.title = parsed.data.title;
    }
    if (parsed.data.description !== task.description) {
      patch.description = parsed.data.description;
    }
    if (priority !== task.priority) {
      patch.priority = priority;
    }
    if (status !== task.status) {
      patch.status = status;
    }
    if (Object.keys(patch).length === 0) {
      onSaved(task);
      return;
    }
    update.mutate({ task, patch }, { onSuccess: onSaved });
  };

  return (
    <Box
      component={editing ? 'form' : 'div'}
      noValidate
      onSubmit={editing ? handleSave : undefined}
      sx={{ display: 'contents' }}
    >
      {editing && (
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            pl: 3,
            pr: 1.5,
            py: 0.5,
            bgcolor: amber[100],
          }}
        >
          <Typography role="status" variant="body2" sx={{ fontWeight: 500 }}>
            ⚠️ Режим редактирования
          </Typography>
          <IconButton size="small" aria-label="Закрыть" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      )}

      <DialogTitle
        component={editing ? 'div' : 'h2'}
        sx={{ pr: editing ? 3 : 7, overflowWrap: 'anywhere' }}
      >
        {editing ? (
          <TitleField
            value={title}
            onChange={setTitle}
            error={errors.title?.[0]}
          />
        ) : (
          task.title
        )}
      </DialogTitle>
      {!editing && (
        <IconButton
          aria-label="Закрыть"
          onClick={onClose}
          sx={{ position: 'absolute', top: 12, right: 12 }}
        >
          <CloseIcon />
        </IconButton>
      )}

      <DialogContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}>
            <Field label="Приоритет">
              <PriorityPicker
                value={shownPriority}
                onChange={changePriority}
                disabled={saving}
              />
            </Field>
            <Field label="Статус">
              <ChipPicker
                name="Статус"
                value={shownStatus}
                options={TASK_STATUSES}
                getLabel={(option) => STATUS_LABELS[option]}
                getChipProps={() => ({ variant: 'outlined' })}
                onChange={changeStatus}
                disabled={saving}
              />
            </Field>
            <Field label="Создана">
              <Typography variant="body2">
                {dateFormat.format(new Date(task.createdAt))}
              </Typography>
            </Field>
          </Stack>

          <Field label="Описание" stretch>
            {editing ? (
              <DescriptionField
                value={description}
                onChange={setDescription}
                error={errors.description?.[0]}
              />
            ) : task.description ? (
              <Typography
                variant="body1"
                sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
              >
                {task.description}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Нет описания
              </Typography>
            )}
          </Field>

          {(update.isError || move.isError) && (
            <Alert severity="error">
              Не удалось сохранить изменения. Попробуйте ещё раз.
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {editing ? (
          <>
            <Button onClick={onCancelEdit} disabled={saving}>
              Отмена
            </Button>
            <Button
              type="submit"
              variant="contained"
              loading={saving}
              disabled={!parsed.success}
            >
              Сохранить
            </Button>
          </>
        ) : (
          <>
            <Button startIcon={<EditOutlinedIcon />} onClick={onEdit}>
              Редактировать
            </Button>
            <Button
              color="error"
              startIcon={<DeleteOutlinedIcon />}
              onClick={onDelete}
            >
              Удалить
            </Button>
          </>
        )}
      </DialogActions>
    </Box>
  );
}
