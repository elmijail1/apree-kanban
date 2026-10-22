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

export const STATUS_LABELS: Record<TaskStatus, string> = {
  new: "Новая",
  inProgress: "В работе",
  completed: "Готово",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Низкий",
  normal: "Средний",
  high: "Высокий",
};

export const COLUMNS: ReadonlyArray<{ status: TaskStatus; title: string }> =
  TASK_STATUSES.map((status) => ({ status, title: STATUS_LABELS[status] }));

export const PAGE_SIZE = 5;
