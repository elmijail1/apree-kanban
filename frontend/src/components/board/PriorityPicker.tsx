"use client";

import { useState } from "react";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import Chip from "@mui/material/Chip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import {
  PRIORITY_LABELS,
  TASK_PRIORITIES,
  type TaskPriority,
} from "@/lib/tasks";
import { PRIORITY_COLORS, PriorityChip } from "./PriorityChip";

interface PriorityPickerProps {
  value: TaskPriority;
  onChange: (priority: TaskPriority) => void;
  disabled?: boolean;
}

export function PriorityPicker({
  value,
  onChange,
  disabled,
}: PriorityPickerProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const select = (priority: TaskPriority) => {
    setAnchor(null);
    onChange(priority);
  };

  return (
    <>
      <Chip
        size="small"
        color={PRIORITY_COLORS[value]}
        disabled={disabled}
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        aria-label={`Приоритет: ${PRIORITY_LABELS[value]}. Изменить`}
        label={
          <Stack direction="row" sx={{ alignItems: "center" }}>
            {PRIORITY_LABELS[value]}
            <ArrowDropDownIcon fontSize="small" sx={{ mr: -0.75 }} />
          </Stack>
        }
      />
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
      >
        {TASK_PRIORITIES.filter((priority) => priority !== value).map(
          (priority) => (
            <MenuItem key={priority} dense onClick={() => select(priority)}>
              <PriorityChip priority={priority} />
            </MenuItem>
          ),
        )}
      </Menu>
    </>
  );
}
