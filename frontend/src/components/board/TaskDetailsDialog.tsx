"use client";

import type { ReactNode } from "react";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { STATUS_LABELS, type Task } from "@/lib/tasks";
import { PriorityChip } from "./PriorityChip";

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "long",
  timeStyle: "short",
});

interface TaskDetailsDialogProps {
  task: Task;
  open: boolean;
  onClose: () => void;
}

export function TaskDetailsDialog({
  task,
  open,
  onClose,
}: TaskDetailsDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
    >
      <DialogTitle sx={{ pr: 7, overflowWrap: "anywhere" }}>
        {task.title}
      </DialogTitle>
      <IconButton
        aria-label="Закрыть"
        onClick={onClose}
        sx={{ position: "absolute", top: 12, right: 12 }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap" }}>
            <Field label="Приоритет">
              <PriorityChip priority={task.priority} />
            </Field>
            <Field label="Статус">
              <Chip
                size="small"
                variant="outlined"
                label={STATUS_LABELS[task.status]}
              />
            </Field>
            <Field label="Создана">
              <Typography variant="body2">
                {dateFormat.format(new Date(task.createdAt))}
              </Typography>
            </Field>
          </Stack>

          <Field label="Описание">
            {task.description ? (
              <Typography
                variant="body1"
                sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
              >
                {task.description}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Нет описания
              </Typography>
            )}
          </Field>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button startIcon={<EditOutlinedIcon />} disabled>
          Редактировать
        </Button>
        <Button color="error" startIcon={<DeleteOutlinedIcon />} disabled>
          Удалить
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack spacing={0.5} sx={{ alignItems: "flex-start" }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      {children}
    </Stack>
  );
}
