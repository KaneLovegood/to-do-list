import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  CloudinaryService,
  UploadedImage,
} from '../cloudinary/cloudinary.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { TodoDocument } from './schemas/todo.schema';
import {
  CreateTodoRecord,
  TodosRepository,
  UpdateTodoRecord,
} from './todos.repository';

export type TodoResponse = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  startDate: string | null;
  deadline: string | null;
  imageUrl: string | null;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class TodosService implements OnModuleInit {
  private readonly logger = new Logger(TodosService.name);

  constructor(
    private readonly todosRepository: TodosRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async onModuleInit(): Promise<void> {
    const migratedCount = await this.todosRepository.migrateLegacyDates();

    if (migratedCount > 0) {
      this.logger.log(`Migrated ${migratedCount} legacy todo date fields.`);
    }
  }

  private validateFiles(files?: Express.Multer.File[]): void {
    if (!files) return;
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        throw new BadRequestException('Each image size must be less than 5MB.');
      }
      if (!/^(image\/(jpeg|png|webp|gif))$/.test(file.mimetype)) {
        throw new BadRequestException('Only JPEG, PNG, WEBP, and GIF images are allowed.');
      }
    }
  }

  async create(
    dto: CreateTodoDto,
    userId: string,
    files?: Express.Multer.File[],
  ): Promise<TodoResponse> {
    this.validateFiles(files);
    this.validateDateRange(dto.startDate, dto.deadline);

    const uploadedImages: UploadedImage[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        const uploaded = await this.cloudinaryService.uploadImage(file);
        uploadedImages.push(uploaded);
      }
    }

    const data: CreateTodoRecord = {
      title: dto.title,
      description: dto.description,
      completed: false,
      startDate: dto.startDate,
      deadline: dto.deadline,
      imageUrl: uploadedImages[0]?.url ?? dto.imageUrl ?? null,
      imagePublicId: uploadedImages[0]?.publicId ?? null,
      imageUrls: uploadedImages.map((img) => img.url),
      imagePublicIds: uploadedImages.map((img) => img.publicId),
      userId,
    };

    try {
      const todo = await this.todosRepository.create(data);
      return this.toResponse(todo);
    } catch (error) {
      for (const img of uploadedImages) {
        await this.cleanupImage(img.publicId);
      }
      throw error;
    }
  }

  async importTodos(
    userId: string,
    dtos: CreateTodoDto[],
  ): Promise<TodoResponse[]> {
    const results: TodoResponse[] = [];
    for (const dto of dtos) {
      this.validateDateRange(dto.startDate, dto.deadline);
      const data: CreateTodoRecord = {
        title: dto.title,
        description: dto.description || '',
        completed: false,
        startDate: dto.startDate,
        deadline: dto.deadline,
        imageUrl: dto.imageUrl ?? null,
        imagePublicId: null,
        imageUrls: dto.imageUrl ? [dto.imageUrl] : [],
        imagePublicIds: [],
        userId,
      };
      const todo = await this.todosRepository.create(data);
      results.push(this.toResponse(todo));
    }
    return results;
  }

  async uploadImage(file: Express.Multer.File): Promise<{ url: string }> {
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Each image size must be less than 5MB.');
    }
    if (!/^(image\/(jpeg|png|webp|gif))$/.test(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, WEBP, and GIF images are allowed.');
    }
    const uploaded = await this.cloudinaryService.uploadImage(file);
    return { url: uploaded.url };
  }

  async findAll(userId: string): Promise<TodoResponse[]> {
    const todos = await this.todosRepository.findAll(userId);
    return todos.map((todo) => this.toResponse(todo));
  }

  async findOne(id: string, userId: string): Promise<TodoResponse> {
    const todo = await this.getTodo(id, userId);
    return this.toResponse(todo);
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateTodoDto,
    files?: Express.Multer.File[],
  ): Promise<TodoResponse> {
    const existing = await this.getTodo(id, userId);
    this.validateFiles(files);
    this.validateImageUpdate(dto, files);

    const data: UpdateTodoRecord = {};
    this.copyDefinedFields(dto, data);

    this.validateDateRange(
      data.startDate ?? existing.startDate,
      data.deadline !== undefined ? data.deadline : existing.deadline,
    );

    const uploadedImages: UploadedImage[] = [];
    const existingUrls = existing.imageUrls?.length
      ? existing.imageUrls
      : (existing.imageUrl ? [existing.imageUrl] : []);
    const existingPublicIds = existing.imagePublicIds?.length
      ? existing.imagePublicIds
      : (existing.imagePublicId ? [existing.imagePublicId] : []);

    if (files?.length) {
      for (const file of files) {
        uploadedImages.push(await this.cloudinaryService.uploadImage(file));
      }
      data.imageUrls = [...existingUrls, ...uploadedImages.map((image) => image.url)];
      data.imagePublicIds = [...existingPublicIds, ...uploadedImages.map((image) => image.publicId)];
      data.imageUrl = data.imageUrls[0] ?? null;
      data.imagePublicId = data.imagePublicIds[0] ?? null;
    } else if (dto.removeImage === true || dto.imageUrl === null) {
      data.imageUrl = null;
      data.imagePublicId = null;
      data.imageUrls = [];
      data.imagePublicIds = [];
    } else if (dto.imageUrl !== undefined) {
      data.imageUrls = dto.imageUrl ? [...existingUrls, dto.imageUrl] : existingUrls;
      data.imagePublicIds = existingPublicIds;
      data.imageUrl = data.imageUrls[0] ?? null;
      data.imagePublicId = existingPublicIds[0] ?? null;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No data provided to update.');
    }

    try {
      const updated = await this.todosRepository.update(id, userId, data);

      if (!updated) {
        throw new NotFoundException('Todo not found.');
      }

      if (dto.removeImage === true || dto.imageUrl === null) {
        for (const publicId of existingPublicIds) await this.cleanupImage(publicId);
      }

      return this.toResponse(updated);
    } catch (error) {
      for (const image of uploadedImages) await this.cleanupImage(image.publicId);

      throw error;
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    const deleted = await this.todosRepository.delete(id, userId);

    if (!deleted) {
      throw new NotFoundException('Todo not found.');
    }

    const publicIdsToClean = deleted.imagePublicIds && deleted.imagePublicIds.length > 0
      ? deleted.imagePublicIds
      : (deleted.imagePublicId ? [deleted.imagePublicId] : []);

    for (const publicId of publicIdsToClean) {
      await this.cleanupImage(publicId);
    }
  }

  private async getTodo(id: string, userId: string): Promise<TodoDocument> {
    const todo = await this.todosRepository.findById(id, userId);

    if (!todo) {
      throw new NotFoundException('Todo not found.');
    }

    return todo;
  }

  private validateImageUpdate(
    dto: UpdateTodoDto,
    files?: Express.Multer.File[],
  ): void {
    if (files?.length && dto.removeImage === true) {
      throw new BadRequestException(
        'Images cannot be added and removed in the same update.',
      );
    }

    if (dto.removeImage === true && dto.imageUrl !== undefined) {
      throw new BadRequestException(
        'Send either imageUrl or removeImage, not both.',
      );
    }
  }

  private copyDefinedFields(dto: UpdateTodoDto, data: UpdateTodoRecord): void {
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.completed !== undefined) data.completed = dto.completed;
    if (dto.startDate !== undefined) data.startDate = dto.startDate;
    if (dto.deadline !== undefined) data.deadline = dto.deadline;
  }

  private validateDateRange(
    startDate: string | null,
    deadline: string | null,
  ): void {
    if (startDate && deadline && deadline < startDate) {
      throw new BadRequestException(
        'The deadline cannot be earlier than the start date.',
      );
    }
  }

  private async cleanupImage(publicId: string): Promise<void> {
    try {
      await this.cloudinaryService.deleteImage(publicId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Could not delete Cloudinary image ${publicId}: ${message}`,
      );
    }
  }

  private toResponse(todo: TodoDocument): TodoResponse {
    return {
      id: todo._id.toString(),
      title: todo.title,
      description: todo.description,
      completed: todo.completed,
      startDate: todo.startDate,
      deadline: todo.deadline,
      imageUrl: todo.imageUrl,
      imageUrls: todo.imageUrls || [],
      createdAt: todo.createdAt.toISOString(),
      updatedAt: todo.updatedAt.toISOString(),
    };
  }
}
