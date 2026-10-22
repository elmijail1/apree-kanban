"use client";

import { useState, type SubmitEvent, type ReactNode } from "react";
import { z } from "zod";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { amber } from "@mui/material/colors";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { useUpdateTask } from "@/lib/taskMutations";
import {
  DESCRIPTION_MAX,
  TITLE_MAX,
  taskContentSchema,
  type TaskContent,
} from "@/lib/taskSchema";
import { STATUS_LABELS, type Task } from "@/lib/tasks";
import { PriorityChip } from "./PriorityChip";

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "long",
  timeStyle: "short",
});

interface TaskDetailsDialogProps {
  task: Task;
  open: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaved: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function TaskDetailsDialog(props: TaskDetailsDialogProps) {
  const { open, editing, onCancelEdit, onClose } = props;
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const handleClose = (
    _: unknown,
    reason: "backdropClick" | "escapeKeyDown",
  ) => {
    if (editing && reason === "escapeKeyDown") {
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
      <DetailsContent key={editing ? "edit" : "view"} {...props} />
    </Dialog>
  );
}

function DetailsContent({
  task,
  editing,
  onEdit,
  onCancelEdit,
  onSaved,
  onDelete,
  onClose,
}: TaskDetailsDialogProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const update = useUpdateTask();

  const parsed = taskContentSchema.safeParse({ title, description });
  const errors = parsed.success ? {} : z.flattenError(parsed.error).fieldErrors;

  const handleSave = (event: SubmitEvent) => {
    event.preventDefault();
    if (!parsed.success) {
      return;
    }
    const patch: Partial<TaskContent> = {};
    if (parsed.data.title !== task.title) {
      patch.title = parsed.data.title;
    }
    if (parsed.data.description !== task.description) {
      patch.description = parsed.data.description;
    }
    if (Object.keys(patch).length === 0) {
      onSaved();
      return;
    }
    update.mutate({ id: task.id, patch }, { onSuccess: onSaved });
  };

  return (
    <Box
      component={editing ? "form" : "div"}
      noValidate
      onSubmit={editing ? handleSave : undefined}
      sx={{ display: "contents" }}
    >
      {editing && (
        <Box
          role="status"
          sx={{
            px: 3,
            py: 1,
            bgcolor: amber[100],
            typography: "body2",
            fontWeight: 500,
          }}
        >
          ⚠️ Режим редактирования
        </Box>
      )}

      <DialogTitle
        component={editing ? "div" : "h2"}
        sx={{ pr: editing ? 3 : 7, overflowWrap: "anywhere" }}
      >
        {editing ? (
          <TextField
            variant="standard"
            fullWidth
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            error={Boolean(errors.title)}
            helperText={errors.title?.[0] ?? `${title.length}/${TITLE_MAX}`}
            slotProps={{
              htmlInput: { "aria-label": "Название" },
              input: { sx: { typography: "h6" } },
            }}
          />
        ) : (
          task.title
        )}
      </DialogTitle>
      {!editing && (
        <IconButton
          aria-label="Закрыть"
          onClick={onClose}
          sx={{ position: "absolute", top: 12, right: 12 }}
        >
          <CloseIcon />
        </IconButton>
      )}

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

          <Field label="Описание" stretch>
            {editing ? (
              <TextField
                multiline
                minRows={3}
                fullWidth
                placeholder="Добавьте описание"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                error={Boolean(errors.description)}
                helperText={
                  errors.description?.[0] ??
                  `${description.length}/${DESCRIPTION_MAX}`
                }
                slotProps={{
                  htmlInput: { "aria-label": "Описание" },
                  input: { sx: { bgcolor: "background.paper" } },
                }}
              />
            ) : task.description ? (
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

          {update.isError && (
            <Alert severity="error">
              Не удалось сохранить изменения. Попробуйте ещё раз.
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {editing ? (
          <>
            <Button onClick={onCancelEdit} disabled={update.isPending}>
              Отмена
            </Button>
            <Button
              type="submit"
              variant="contained"
              loading={update.isPending}
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

function Field({
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
      sx={{ alignItems: stretch ? "stretch" : "flex-start" }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      {children}
    </Stack>
  );
}
