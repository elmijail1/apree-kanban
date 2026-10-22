import Chip, { type ChipProps } from '@mui/material/Chip';
import { PRIORITY_LABELS, type TaskPriority } from '@/lib/tasks';

export const PRIORITY_COLORS: Record<TaskPriority, ChipProps['color']> = {
  low: 'default',
  normal: 'info',
  high: 'error',
};

export function PriorityChip({ priority }: { priority: TaskPriority }) {
  return (
    <Chip
      size="small"
      label={PRIORITY_LABELS[priority]}
      color={PRIORITY_COLORS[priority]}
    />
  );
}
