import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskStatus } from '../generated/prisma/enums.js';
import { Prisma, type Task } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { decodeCursor, encodeCursor, type TaskCursor } from './task-cursor.js';
import type {
  CreateTaskInput,
  ListTasksQuery,
  UpdateTaskInput,
  UpdateTaskStatusInput,
} from './tasks.schemas.js';

const RECORD_NOT_FOUND = 'P2025';

function rethrowNotFound(error: unknown, id: string): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === RECORD_NOT_FOUND
  ) {
    throw new NotFoundException(`Task ${id} not found`);
  }
  throw error;
}

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
    const now = new Date();
    return this.prisma.task.create({
      data: { ...input, createdAt: now, updatedAt: now, statusChangedAt: now },
    });
  }

  async updateStatus(
    id: string,
    { status }: UpdateTaskStatusInput,
  ): Promise<Task> {
    const now = new Date();
    await this.prisma.task.updateMany({
      where: { id, status: { not: status } },
      data: { status, updatedAt: now, statusChangedAt: now },
    });
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return task;
  }

  async update(id: string, input: UpdateTaskInput): Promise<Task> {
    try {
      return await this.prisma.task.update({ where: { id }, data: input });
    } catch (error) {
      rethrowNotFound(error, id);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.task.delete({ where: { id } });
    } catch (error) {
      rethrowNotFound(error, id);
    }
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
