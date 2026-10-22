"use client";

import { useState } from "react";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import Chip, { type ChipProps } from "@mui/material/Chip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";

interface ChipPickerProps<T extends string> {
  name: string;
  value: T | null;
  options: readonly T[];
  getLabel: (option: T) => string;
  getChipProps?: (option: T) => Pick<ChipProps, "color" | "variant">;
  placeholder?: string;
  onChange: (option: T) => void;
  disabled?: boolean;
}

export function ChipPicker<T extends string>({
  name,
  value,
  options,
  getLabel,
  getChipProps,
  placeholder = "Выберите…",
  onChange,
  disabled,
}: ChipPickerProps<T>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const label = value ? getLabel(value) : placeholder;

  const select = (option: T) => {
    setAnchor(null);
    onChange(option);
  };

  return (
    <>
      <Chip
        size="small"
        {...(value ? getChipProps?.(value) : { variant: "outlined" })}
        disabled={disabled}
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        aria-label={`${name}: ${value ? label : "не выбран"}. Изменить`}
        label={
          <Stack direction="row" sx={{ alignItems: "center" }}>
            {label}
            <ArrowDropDownIcon fontSize="small" sx={{ mr: -0.75 }} />
          </Stack>
        }
      />
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
      >
        {options
          .filter((option) => option !== value)
          .map((option) => (
            <MenuItem key={option} dense onClick={() => select(option)}>
              <Chip
                size="small"
                {...getChipProps?.(option)}
                label={getLabel(option)}
              />
            </MenuItem>
          ))}
      </Menu>
    </>
  );
}
