import { PAGE_SIZE, type TaskPage, type TaskStatus } from "./tasks";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, init);
  if (!response.ok) {
    const body: { message?: unknown } | null = await response
      .json()
      .catch(() => null);
    const message =
      typeof body?.message === "string" ? body.message : response.statusText;
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export function fetchColumnPage(
  status: TaskStatus,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<TaskPage> {
  const params = new URLSearchParams({ status, limit: String(PAGE_SIZE) });
  if (cursor) {
    params.set("cursor", cursor);
  }
  return request<TaskPage>(`/tasks?${params}`, { signal });
}
