'use client';

import type { ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DESCRIPTION_MAX, TITLE_MAX } from '@/lib/taskSchema';
import {
  PRIORITY_LABELS,
  TASK_PRIORITIES,
  type TaskPriority,
} from '@/lib/tasks';
import { ChipPicker } from './ChipPicker';
import { PRIORITY_COLORS } from './PriorityChip';

interface TextFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function TitleField({
  value,
  onChange,
  error,
  placeholder,
}: TextFieldProps & { placeholder?: string }) {
  return (
    <TextField
      variant="standard"
      fullWidth
      autoFocus
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={Boolean(error)}
      helperText={error ?? `${value.length}/${TITLE_MAX}`}
      slotProps={{
        htmlInput: { 'aria-label': 'Название' },
        input: { sx: { typography: 'h6' } },
      }}
    />
  );
}

export function DescriptionField({ value, onChange, error }: TextFieldProps) {
  return (
    <TextField
      multiline
      minRows={3}
      fullWidth
      placeholder="Добавьте описание"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={Boolean(error)}
      helperText={error ?? `${value.length}/${DESCRIPTION_MAX}`}
      slotProps={{
        htmlInput: { 'aria-label': 'Описание' },
        input: { sx: { bgcolor: 'background.paper' } },
      }}
    />
  );
}

export function PriorityPicker({
  value,
  onChange,
  disabled,
}: {
  value: TaskPriority | null;
  onChange: (priority: TaskPriority) => void;
  disabled?: boolean;
}) {
  return (
    <ChipPicker
      name="Приоритет"
      value={value}
      options={TASK_PRIORITIES}
      getLabel={(option) => PRIORITY_LABELS[option]}
      getChipProps={(option) => ({ color: PRIORITY_COLORS[option] })}
      onChange={onChange}
      disabled={disabled}
    />
  );
}

export function Field({
  label,
  children,
  stretch = false,
}: {
  label: string;
  children: ReactNode;
  stretch?: boolean;
}) {
  return (
    <Stack
      spacing={0.5}
      sx={{ alignItems: stretch ? 'stretch' : 'flex-start' }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      {children}
    </Stack>
  );
}
