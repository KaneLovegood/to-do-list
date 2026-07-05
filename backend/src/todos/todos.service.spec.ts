import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { TodoDocument } from './schemas/todo.schema';
import { TodosRepository } from './todos.repository';
import { TodosService } from './todos.service';

const todoDocument = (overrides: Partial<TodoDocument> = {}): TodoDocument =>
  ({
    _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
    title: 'Test todo',
    description: '',
    completed: false,
    startDate: '2026-07-05',
    deadline: null,
    imageUrl: null,
    imagePublicId: null,
    createdAt: new Date('2026-07-05T00:00:00.000Z'),
    updatedAt: new Date('2026-07-05T00:00:00.000Z'),
    ...overrides,
  }) as unknown as TodoDocument;

describe('TodosService', () => {
  let service: TodosService;
  let repository: jest.Mocked<TodosRepository>;
  let cloudinary: jest.Mocked<CloudinaryService>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      migrateLegacyDates: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<TodosRepository>;
    cloudinary = {
      uploadImage: jest.fn(),
      deleteImage: jest.fn(),
    };
    service = new TodosService(repository, cloudinary);
  });

  it('migrates legacy deadline values when the module starts', async () => {
    repository.migrateLegacyDates.mockResolvedValue(1);

    await service.onModuleInit();

    expect(repository.migrateLegacyDates.mock.calls).toHaveLength(1);
  });

  it('uploads an image and persists its Cloudinary identifiers', async () => {
    const file = { buffer: Buffer.from('image'), mimetype: 'image/png', size: 5 } as Express.Multer.File;
    cloudinary.uploadImage.mockResolvedValue({
      publicId: 'todo-list/task',
      url: 'https://res.cloudinary.com/demo/image/upload/task.png',
    });
    repository.create.mockResolvedValue(
      todoDocument({
        imagePublicId: 'todo-list/task',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/task.png',
      }),
    );

    const result = await service.create(
      {
        title: 'Test todo',
        description: '',
        startDate: '2026-07-05',
        deadline: null,
      },
      [file],
    );

    expect(repository.create.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        startDate: '2026-07-05',
        imagePublicId: 'todo-list/task',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/task.png',
      }),
    );
    expect(result.id).toBe('507f1f77bcf86cd799439011');
  });

  it('rejects a deadline earlier than the start date', async () => {
    await expect(
      service.create({
        title: 'Test todo',
        description: '',
        startDate: '2026-07-05',
        deadline: '2026-07-04',
      }),
    ).rejects.toThrow('The deadline cannot be earlier than the start date.');
  });

  it('deletes the Cloudinary asset after deleting its todo', async () => {
    repository.delete.mockResolvedValue(
      todoDocument({ imagePublicId: 'todo-list/task' }),
    );

    await service.delete('507f1f77bcf86cd799439011');

    expect(cloudinary.deleteImage.mock.calls[0]?.[0]).toBe('todo-list/task');
  });

  it('returns not found for an unknown todo', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.findOne('507f1f77bcf86cd799439012'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
