import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { ImportTodosDto } from './dto/import-todos.dto';
import { TodosService } from './todos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';

const maxImageSize = 5 * 1024 * 1024;

const optionalImagePipe = new ParseFilePipeBuilder()
  .addFileTypeValidator({ fileType: /^(image\/(jpeg|png|webp|gif))$/ })
  .addMaxSizeValidator({ maxSize: maxImageSize })
  .build({
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    fileIsRequired: false,
  });

const imageUploadOptions = {
  limits: {
    fileSize: maxImageSize,
    files: 10,
  },
};

@Controller('todos')
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 10, imageUploadOptions))
  async create(
    @Body() dto: CreateTodoDto,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const todo = await this.todosService.create(dto, user.id, files);
    return { todo };
  }

  @Post('import')
  @UseGuards(JwtAuthGuard)
  async import(
    @Body() dto: ImportTodosDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const todos = await this.todosService.importTodos(user.id, dto.todos);
    return { todos };
  }

  @Post('upload-image')
  @UseInterceptors(FilesInterceptor('images', 10, imageUploadOptions))
  async uploadImage(
    @UploadedFile(optionalImagePipe) file?: Express.Multer.File,
  ) {
    if (!file) {
      return { url: null };
    }
    const data = await this.todosService.uploadImage(file);
    return data;
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    const todos = await this.todosService.findAll(user.id);
    return { todos };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const todo = await this.todosService.findOne(id, user.id);
    return { todo };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTodoDto,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const todo = await this.todosService.update(id, user.id, dto, files);
    return { todo };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.todosService.delete(id, user.id);
    return { message: 'Todo deleted successfully.' };
  }
}
