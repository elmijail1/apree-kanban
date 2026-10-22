import { z } from 'zod';
import { TaskPriority, TaskStatus } from '../generated/prisma/enums.js';

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 200;
export const DEFAULT_PAGE_SIZE = 5;
export const MAX_PAGE_SIZE = 50;

export const taskStatusSchema = z.enum(TaskStatus);
export const taskPrioritySchema = z.enum(TaskPriority);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(TITLE_MAX),
  description: z.string().trim().max(DESCRIPTION_MAX),
  priority: taskPrioritySchema,
});
export type CreateTaskInput = z.output<typeof createTaskSchema>;

export const updateTaskSchema = z
  .strictObject(createTaskSchema.shape)
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'Provide at least one field to update',
  });
export type UpdateTaskInput = z.output<typeof updateTaskSchema>;

export const updateTaskStatusSchema = z.object({
  status: taskStatusSchema,
});
export type UpdateTaskStatusInput = z.output<typeof updateTaskStatusSchema>;

export const listTasksQuerySchema = z
  .object({
    status: z.union([taskStatusSchema, z.literal('all')]).default('all'),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE),
    cursor: z.string().min(1).optional(),
  })
  .refine((query) => !(query.cursor && query.status === 'all'), {
    message: 'cursor requires a single status',
    path: ['cursor'],
  });
export type ListTasksQuery = z.output<typeof listTasksQuerySchema>;
