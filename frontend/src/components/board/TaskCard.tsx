import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Card from "@mui/material/Card";
import Chip, { type ChipProps } from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  DESCRIPTION_PREVIEW_LENGTH,
  PRIORITY_LABELS,
  previewText,
  type Task,
  type TaskPriority,
} from "@/lib/tasks";

const PRIORITY_COLORS: Record<TaskPriority, ChipProps["color"]> = {
  low: "default",
  normal: "info",
  high: "error",
};

export function TaskCard({ task }: { task: Task }) {
  const description = previewText(task.description, DESCRIPTION_PREVIEW_LENGTH);

  return (
    <Card component="article" variant="outlined" sx={{ p: 1.5 }}>
      <Typography
        variant="subtitle1"
        component="h3"
        sx={{ fontWeight: 500, lineHeight: 1.3, overflowWrap: "anywhere" }}
      >
        {task.title}
      </Typography>

      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5, overflowWrap: "anywhere" }}
        >
          {description}
        </Typography>
      )}

      <Stack
        direction="row"
        sx={{ mt: 1, alignItems: "center", justifyContent: "space-between" }}
      >
        <Chip
          size="small"
          label={PRIORITY_LABELS[task.priority]}
          color={PRIORITY_COLORS[task.priority]}
        />
        <Stack direction="row">
          <IconButton size="small" aria-label="Редактировать" disabled>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" aria-label="Удалить" disabled>
            <DeleteOutlinedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
    </Card>
  );
}
