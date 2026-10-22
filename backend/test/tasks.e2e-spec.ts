import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import type { TaskStatus } from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

interface TaskJson {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  statusChangedAt: string;
}

interface PageJson {
  items: TaskJson[];
  nextCursor: string | null;
}

const LONG_AGO = new Date('2026-01-01T00:00:00.000Z');

describe('Tasks API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const api = () => request(app.getHttpServer());

  const seedTask = (status: TaskStatus = 'new', at = LONG_AGO) =>
    prisma.task.create({
      data: {
        title: 'Seeded',
        description: '',
        priority: 'normal',
        status,
        createdAt: at,
        updatedAt: at,
        statusChangedAt: at,
      },
    });

  const listColumn = async (status: TaskStatus, limit = 5) =>
    (await api().get('/tasks').query({ status, limit }).expect(200))
      .body as PageJson;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.task.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a trimmed task in the "new" column with equal timestamps', async () => {
    const response = await api()
      .post('/tasks')
      .send({ title: '  Buy milk  ', description: ' 2L ', priority: 'high' })
      .expect(201);
    const task = response.body as TaskJson;

    expect(task).toMatchObject({
      title: 'Buy milk',
      description: '2L',
      priority: 'high',
      status: 'new',
    });
    expect(task.updatedAt).toBe(task.createdAt);
    expect(task.statusChangedAt).toBe(task.createdAt);
  });

  it.each([
    ['a whitespace-only title', { title: '   ' }],
    ['a 61-character title', { title: 'x'.repeat(61) }],
    ['a 201-character description', { description: 'x'.repeat(201) }],
    ['an unknown priority', { priority: 'urgent' }],
    ['no priority', { priority: undefined }],
  ])('rejects a task with %s', async (_, override) => {
    await api()
      .post('/tasks')
      .send({ title: 'Task', description: '', priority: 'normal', ...override })
      .expect(400);

    expect(await prisma.task.count()).toBe(0);
  });

  it('pages through a column in order without gaps or duplicates, including ties', async () => {
    const at = (ms: number) => new Date(LONG_AGO.getTime() + ms);
    const seeded = await Promise.all([
      seedTask('new', at(1000)),
      seedTask('new', at(1000)),
      seedTask('new', at(1000)),
      seedTask('new', at(2000)),
      seedTask('new', at(0)),
      seedTask('inProgress', at(3000)),
    ]);
    const expected = seeded
      .filter((task) => task.status === 'new')
      .sort(
        (a, b) =>
          b.statusChangedAt.getTime() - a.statusChangedAt.getTime() ||
          b.id.localeCompare(a.id),
      )
      .map((task) => task.id);

    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const query: Record<string, string | number> = {
        status: 'new',
        limit: 2,
      };
      if (cursor) {
        query.cursor = cursor;
      }
      const page = (await api().get('/tasks').query(query).expect(200))
        .body as PageJson;
      seen.push(...page.items.map((task) => task.id));
      cursor = page.nextCursor;
    } while (cursor);

    expect(seen).toEqual(expected);
  });

  it('moves a task to the top of another column and bumps its timestamps', async () => {
    await seedTask('inProgress', new Date(LONG_AGO.getTime() + 1000));
    const task = await seedTask('new');

    const moved = (
      await api()
        .patch(`/tasks/${task.id}`)
        .send({ status: 'inProgress' })
        .expect(200)
    ).body as TaskJson;

    expect(moved.status).toBe('inProgress');
    expect(new Date(moved.statusChangedAt) > LONG_AGO).toBe(true);
    expect(moved.updatedAt).toBe(moved.statusChangedAt);
    expect(moved.createdAt).toBe(LONG_AGO.toISOString());
    expect((await listColumn('inProgress')).items[0]?.id).toBe(task.id);
    expect((await listColumn('new')).items).toHaveLength(0);
  });

  it('changes statusChangedAt only on a real move, not on content edits or a repeated status', async () => {
    const task = await seedTask('new');
    const original = LONG_AGO.toISOString();
    const patch = async (body: object) =>
      (await api().patch(`/tasks/${task.id}`).send(body).expect(200))
        .body as TaskJson;

    const sameStatus = await patch({ status: 'new' });
    expect(sameStatus.statusChangedAt).toBe(original);

    const edited = await patch({ title: 'Renamed' });
    expect(edited.title).toBe('Renamed');
    expect(new Date(edited.updatedAt) > LONG_AGO).toBe(true);
    expect(edited.statusChangedAt).toBe(original);

    const editedAndMoved = await patch({ title: 'Done', status: 'completed' });
    expect(editedAndMoved).toMatchObject({
      title: 'Done',
      status: 'completed',
    });
    expect(editedAndMoved.statusChangedAt).toBe(editedAndMoved.updatedAt);
    expect(new Date(editedAndMoved.statusChangedAt) > LONG_AGO).toBe(true);
  });

  it('rejects an unknown status and returns 404 for a deleted task', async () => {
    const task = await seedTask('new');

    await api().patch(`/tasks/${task.id}`).send({ status: 'done' }).expect(400);
    expect(
      (await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status,
    ).toBe('new');

    await api().delete(`/tasks/${task.id}`).expect(204);
    await api().delete(`/tasks/${task.id}`).expect(404);
    await api().patch(`/tasks/${task.id}`).send({ title: 'Ghost' }).expect(404);
  });
});
