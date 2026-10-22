export const TASK_STATUSES = ["new", "inProgress", "completed"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "normal", "high"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  statusChangedAt: string;
}

export interface TaskPage {
  items: Task[];
  nextCursor: string | null;
}

export const COLUMNS: ReadonlyArray<{ status: TaskStatus; title: string }> = [
  { status: "new", title: "Новая" },
  { status: "inProgress", title: "В работе" },
  { status: "completed", title: "Готово" },
];

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Низкий",
  normal: "Средний",
  high: "Высокий",
};

export const PAGE_SIZE = 5;
export const DESCRIPTION_PREVIEW_LENGTH = 50;

export function previewText(text: string, maxLength: number): string {
  const chars = Array.from(text.trim());
  return chars.length > maxLength
    ? `${chars.slice(0, maxLength).join("").trimEnd()}…`
    : chars.join("");
}
