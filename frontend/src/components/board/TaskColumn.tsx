"use client";

import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { fetchColumnPage } from "@/lib/api";
import type { TaskStatus } from "@/lib/tasks";
import { TaskCard } from "./TaskCard";

interface TaskColumnProps {
  status: TaskStatus;
  title: string;
}

export function TaskColumn({ status, title }: TaskColumnProps) {
  const query = useInfiniteQuery({
    queryKey: ["tasks", status],
    queryFn: ({ pageParam, signal }) =>
      fetchColumnPage(status, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && !isFetchingNextPage) {
        void fetchNextPage();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const tasks = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Paper
      component="section"
      aria-label={title}
      variant="outlined"
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        bgcolor: "grey.50",
      }}
    >
      <Typography
        variant="subtitle1"
        component="h2"
        sx={{ px: 2, pt: 1.5, pb: 1, fontWeight: 500 }}
      >
        {title}
      </Typography>

      <Stack
        spacing={1}
        sx={{
          px: 1.5,
          pb: 1.5,
          overflowY: "auto",
          flex: 1,
          "& > *": { flexShrink: 0 },
        }}
      >
        {query.isPending ? (
          Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} variant="rounded" height={104} />
          ))
        ) : query.isError && tasks.length === 0 ? (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => void query.refetch()}
              >
                Повторить
              </Button>
            }
          >
            Не удалось загрузить задачи
          </Alert>
        ) : tasks.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ py: 3, textAlign: "center" }}
          >
            Нет задач
          </Typography>
        ) : (
          tasks.map((task) => <TaskCard key={task.id} task={task} />)
        )}

        {query.isFetchNextPageError && (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => void fetchNextPage()}
              >
                Повторить
              </Button>
            }
          >
            Не удалось загрузить ещё
          </Alert>
        )}
        {isFetchingNextPage && (
          <CircularProgress size={24} sx={{ alignSelf: "center" }} />
        )}
        <div ref={sentinelRef} />
      </Stack>
    </Paper>
  );
}
