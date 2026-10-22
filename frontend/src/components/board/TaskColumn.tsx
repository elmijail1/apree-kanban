"use client";

import { useEffect, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useInfiniteQuery } from "@tanstack/react-query";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { fetchColumnPage } from "@/lib/api";
import type { TaskStatus } from "@/lib/tasks";
import { TaskCard, type DraggedTask } from "./TaskCard";

const CARD_HEIGHT = 85;
const CARD_GAP = 8;
const LIST_PADDING_BOTTOM = 16;
const BOTTOM_FADE_HEIGHT = 24;

const listHeight = (visibleCards: number) =>
  Math.round(
    visibleCards * CARD_HEIGHT +
      (Math.ceil(visibleCards) - 1) * CARD_GAP +
      LIST_PADDING_BOTTOM,
  );

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

  const { setNodeRef, isOver, active } = useDroppable({ id: status });
  const dragged = active?.data.current as DraggedTask | undefined;
  const isDropTarget = isOver && dragged?.task.status !== status;

  const tasks = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Paper
      ref={setNodeRef}
      component="section"
      aria-label={title}
      variant="outlined"
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        "&::after": {
          content: '""',
          display: isDropTarget ? "none" : "block",
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: BOTTOM_FADE_HEIGHT,
          borderRadius: "inherit",
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          pointerEvents: "none",
          background: (theme) =>
            `linear-gradient(to bottom, ${alpha(theme.palette.grey[50], 0)}, ${theme.palette.grey[50]})`,
        },
        bgcolor: (theme) =>
          isDropTarget
            ? alpha(theme.palette.primary.main, 0.08)
            : theme.palette.grey[50],
        borderColor: isDropTarget ? "primary.main" : undefined,
        outline: isDropTarget ? "1px solid" : "none",
        outlineColor: "primary.main",
        transition: (theme) =>
          theme.transitions.create(["background-color", "border-color"], {
            duration: theme.transitions.duration.shortest,
          }),
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
          pb: `${LIST_PADDING_BOTTOM}px`,
          overflowY: "auto",
          maxHeight: { xs: listHeight(2.6), md: listHeight(4.5) },
          height: { md: listHeight(4.5) },
          "& > *": { flexShrink: 0 },
        }}
      >
        {query.isPending ? (
          Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} variant="rounded" height={CARD_HEIGHT} />
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
