"use client";

import AddIcon from "@mui/icons-material/Add";
import Button from "@mui/material/Button";
import { useTaskDialogs } from "./TaskDialogs";

export function AddTaskButton() {
  const { openCreate } = useTaskDialogs();

  return (
    <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
      Добавить задачу
    </Button>
  );
}
