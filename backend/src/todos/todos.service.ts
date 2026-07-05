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

  async findAll(): Promise<TodoResponse[]> {
    const todos = await this.todosRepository.findAll();
    return todos.map((todo) => this.toResponse(todo));
  }

  async findOne(id: string): Promise<TodoResponse> {
    const todo = await this.getTodo(id);
    return this.toResponse(todo);
  }

  async update(
    id: string,
    dto: UpdateTodoDto,
    file?: Express.Multer.File,
  ): Promise<TodoResponse> {
    const existing = await this.getTodo(id);
    this.validateImageUpdate(dto, file);

    const data: UpdateTodoRecord = {};
    this.copyDefinedFields(dto, data);

    this.validateDateRange(
      data.startDate ?? existing.startDate,
      data.deadline !== undefined ? data.deadline : existing.deadline,
    );

    let uploadedImage: UploadedImage | undefined;
    const shouldReplaceImage =
      Boolean(file) || dto.removeImage === true || dto.imageUrl !== undefined;

    if (file) {
      uploadedImage = await this.cloudinaryService.uploadImage(file);
      data.imageUrl = uploadedImage.url;
      data.imagePublicId = uploadedImage.publicId;
    } else if (dto.removeImage === true || dto.imageUrl === null) {
      data.imageUrl = null;
      data.imagePublicId = null;
    } else if (dto.imageUrl !== undefined) {
      data.imageUrl = dto.imageUrl;
      data.imagePublicId = null;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No data provided to update.');
    }

    try {
      const updated = await this.todosRepository.update(id, data);

      if (!updated) {
        throw new NotFoundException('Todo not found.');
      }

      if (shouldReplaceImage && existing.imagePublicId) {
        await this.cleanupImage(existing.imagePublicId);
      }

      return this.toResponse(updated);
    } catch (error) {
      if (uploadedImage) {
        await this.cleanupImage(uploadedImage.publicId);
      }

      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.todosRepository.delete(id);

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

  private async getTodo(id: string): Promise<TodoDocument> {
    const todo = await this.todosRepository.findById(id);

    if (!todo) {
      throw new NotFoundException('Todo not found.');
    }

    return todo;
  }

  private validateImageUpdate(
    dto: UpdateTodoDto,
    file?: Express.Multer.File,
  ): void {
    if (file && (dto.removeImage === true || dto.imageUrl !== undefined)) {
      throw new BadRequestException(
        'Send either an image file, imageUrl, or removeImage, not more than one.',
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
