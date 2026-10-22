import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { COLUMNS } from "@/lib/tasks";
import { AddTaskButton } from "./AddTaskButton";
import { TaskColumn } from "./TaskColumn";
import { TaskDialogsProvider } from "./TaskDialogs";

export function Board() {
  return (
    <TaskDialogsProvider>
      <Stack
        component="main"
        spacing={2}
        sx={{
          p: { xs: 2, md: 3 },
          height: { md: "100dvh" },
        }}
      >
        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between", gap: 2 }}
        >
          <Typography variant="h5" component="h1">
            Задачи
          </Typography>
          <AddTaskButton />
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(3, minmax(0, 1fr))",
            },
            gap: 2,
            flex: 1,
            minHeight: 0,
          }}
        >
          {COLUMNS.map((column) => (
            <TaskColumn
              key={column.status}
              status={column.status}
              title={column.title}
            />
          ))}
        </Box>
      </Stack>
    </TaskDialogsProvider>
  );
}
