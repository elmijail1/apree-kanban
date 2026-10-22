'use client';

import { useState, type SubmitEvent } from 'react';
import { z } from 'zod';
import CloseIcon from '@mui/icons-material/Close';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useCreateTask } from '@/lib/taskMutations';
import { taskContentSchema } from '@/lib/taskSchema';
import type { TaskPriority } from '@/lib/tasks';
import {
  DescriptionField,
  Field,
  PriorityPicker,
  TitleField,
} from './TaskFormFields';

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateTaskDialog({ open, onClose }: CreateTaskDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
      aria-label="Новая задача"
    >
      <CreateTaskForm onClose={onClose} />
    </Dialog>
  );
}

function CreateTaskForm({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority | null>(null);
  const create = useCreateTask();

  const parsed = taskContentSchema.safeParse({ title, description });
  const errors = parsed.success ? {} : z.flattenError(parsed.error).fieldErrors;
  const canSave = parsed.success && priority !== null;

  const handleSave = (event: SubmitEvent) => {
    event.preventDefault();
    if (!parsed.success || !priority || create.isPending) {
      return;
    }
    create.mutate({ ...parsed.data, priority }, { onSuccess: onClose });
  };

  return (
    <Box
      component="form"
      noValidate
      onSubmit={handleSave}
      sx={{ display: 'contents' }}
    >
      <DialogTitle component="div" sx={{ pr: 7 }}>
        <TitleField
          placeholder="Название задачи"
          value={title}
          onChange={(value) => {
            setTitle(value);
            setTitleTouched(true);
          }}
          error={titleTouched ? errors.title?.[0] : undefined}
        />
      </DialogTitle>
      <IconButton
        aria-label="Закрыть"
        onClick={onClose}
        sx={{ position: 'absolute', top: 12, right: 12 }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent>
        <Stack spacing={2}>
          <Field label="Приоритет (Обязательное поле)">
            <PriorityPicker
              value={priority}
              onChange={setPriority}
              disabled={create.isPending}
            />
          </Field>

          <Field label="Описание" stretch>
            <DescriptionField
              value={description}
              onChange={setDescription}
              error={errors.description?.[0]}
            />
          </Field>

          {create.isError && (
            <Alert severity="error">
              Не удалось создать задачу. Попробуйте ещё раз.
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={create.isPending}>
          Отмена
        </Button>
        <Button
          type="submit"
          variant="contained"
          loading={create.isPending}
          disabled={!canSave}
        >
          Сохранить
        </Button>
      </DialogActions>
    </Box>
  );
}
