"use client";

import { useState } from "react";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ButtonBase from "@mui/material/ButtonBase";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Task } from "@/lib/tasks";
import { PriorityChip } from "./PriorityChip";
import { TaskDetailsDialog } from "./TaskDetailsDialog";

export function TaskCard({ task }: { task: Task }) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <Card
      component="article"
      variant="outlined"
      sx={{
        position: "relative",
        p: 1.5,
        cursor: "pointer",
        transition: (theme) =>
          theme.transitions.create("background-color", {
            duration: theme.transitions.duration.shortest,
          }),
        "&:hover": { bgcolor: "grey.100" },
        "&:has(:focus-visible)": {
          outline: (theme) => `2px solid ${theme.palette.primary.main}`,
          outlineOffset: "-2px",
        },
      }}
    >
      <ButtonBase
        disableRipple
        onClick={() => setDetailsOpen(true)}
        sx={{
          position: "static",
          display: "block",
          textAlign: "left",
          "&::after": { content: '""', position: "absolute", inset: 0 },
        }}
      >
        <Typography
          variant="subtitle1"
          component="h3"
          sx={{ fontWeight: 500, lineHeight: 1.3, overflowWrap: "anywhere" }}
        >
          {task.title}
        </Typography>
      </ButtonBase>

      <Stack
        direction="row"
        sx={{ mt: 1, alignItems: "center", justifyContent: "space-between" }}
      >
        <PriorityChip priority={task.priority} />
        <Stack direction="row" sx={{ position: "relative", zIndex: 1 }}>
          <IconButton size="small" aria-label="Редактировать" disabled>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" aria-label="Удалить" disabled>
            <DeleteOutlinedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      <TaskDetailsDialog
        task={task}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
      />
    </Card>
  );
}
