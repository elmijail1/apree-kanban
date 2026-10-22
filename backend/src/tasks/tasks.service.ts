import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Task } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { decodeCursor, encodeCursor } from './task-cursor.js';
import type {
  CreateTaskInput,
  ListTasksQuery,
  UpdateTaskInput,
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

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async list({ status, limit, cursor }: ListTasksQuery): Promise<TaskPage> {
    const after = cursor ? decodeCursor(cursor) : undefined;
    const rows = await this.prisma.task.findMany({
      where: {
        status,
        ...(after && {
          OR: [
            { statusChangedAt: { lt: after.statusChangedAt } },
            { statusChangedAt: after.statusChangedAt, id: { lt: after.id } },
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

  create(input: CreateTaskInput): Promise<Task> {
    const now = new Date();
    return this.prisma.task.create({
      data: { ...input, createdAt: now, updatedAt: now, statusChangedAt: now },
    });
  }

  async update(id: string, input: UpdateTaskInput): Promise<Task> {
    const now = new Date();
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (input.status) {
          await tx.task.updateMany({
            where: { id, status: { not: input.status } },
            data: { statusChangedAt: now },
          });
        }
        return tx.task.update({
          where: { id },
          data: { ...input, updatedAt: now },
        });
      });
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
}
