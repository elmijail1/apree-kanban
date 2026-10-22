'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { useDeleteTask } from '@/lib/taskMutations';
import type { Task } from '@/lib/tasks';

interface DeleteTaskDialogProps {
  task: Task;
  open: boolean;
  onClose: () => void;
}

export function DeleteTaskDialog({
  task,
  open,
  onClose,
}: DeleteTaskDialogProps) {
  const deletion = useDeleteTask();

  const close = () => {
    if (!deletion.isPending) {
      deletion.reset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle sx={{ overflowWrap: 'anywhere' }}>
        Вы уверены, что хотите удалить «{task.title}»?
      </DialogTitle>
      <DialogContent>
        <DialogContentText>Это действие нельзя отменить</DialogContentText>
        {deletion.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Не удалось удалить задачу. Попробуйте ещё раз.
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={close} disabled={deletion.isPending}>
          Отмена
        </Button>
        <Button
          variant="contained"
          color="error"
          loading={deletion.isPending}
          onClick={() => deletion.mutate(task, { onSuccess: onClose })}
        >
          Удалить
        </Button>
      </DialogActions>
    </Dialog>
  );
}
