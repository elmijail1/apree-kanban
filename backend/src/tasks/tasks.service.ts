import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskStatus } from '../generated/prisma/enums.js';
import type { Task } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { decodeCursor, encodeCursor, type TaskCursor } from './task-cursor.js';
import type {
  CreateTaskInput,
  ListTasksQuery,
  UpdateTaskStatusInput,
} from './tasks.schemas.js';

export interface TaskPage {
  items: Task[];
  nextCursor: string | null;
}

export type TaskBoard = Partial<Record<TaskStatus, TaskPage>>;

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListTasksQuery): Promise<TaskBoard> {
    const statuses =
      query.status === 'all' ? Object.values(TaskStatus) : [query.status];
    const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;

    const pages = await Promise.all(
      statuses.map((status) => this.listColumn(status, query.limit, cursor)),
    );
    return Object.fromEntries(statuses.map((status, i) => [status, pages[i]]));
  }

  create(input: CreateTaskInput): Promise<Task> {
    return this.prisma.task.create({
      data: { ...input, statusChangedAt: new Date() },
    });
  }

  async updateStatus(
    id: string,
    { status }: UpdateTaskStatusInput,
  ): Promise<Task> {
    await this.prisma.task.updateMany({
      where: { id, status: { not: status } },
      data: { status, statusChangedAt: new Date() },
    });
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return task;
  }

  private async listColumn(
    status: TaskStatus,
    limit: number,
    cursor?: TaskCursor,
  ): Promise<TaskPage> {
    const rows = await this.prisma.task.findMany({
      where: {
        status,
        ...(cursor && {
          OR: [
            { statusChangedAt: { lt: cursor.statusChangedAt } },
            { statusChangedAt: cursor.statusChangedAt, id: { lt: cursor.id } },
          ],
        }),
      },
      orderBy: [{ statusChangedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const items = rows.slice(0, limit);
    const last = items.at(-1);
    return {
      items,
      nextCursor: rows.length > limit && last ? encodeCursor(last) : null,
    };
  }
}
