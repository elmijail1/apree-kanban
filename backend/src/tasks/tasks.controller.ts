import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskStatusSchema,
  type CreateTaskInput,
  type ListTasksQuery,
  type UpdateTaskStatusInput,
} from './tasks.schemas.js';
import { TasksService } from './tasks.service.js';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listTasksQuerySchema)) query: ListTasksQuery,
  ) {
    return this.tasks.list(query);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createTaskSchema)) body: CreateTaskInput) {
    return this.tasks.create(body);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateTaskStatusSchema))
    body: UpdateTaskStatusInput,
  ) {
    return this.tasks.updateStatus(id, body);
  }
}
