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
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { TodosService } from './todos.service';

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
  @UseInterceptors(FilesInterceptor('images', 10, imageUploadOptions))
  async create(
    @Body() dto: CreateTodoDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const todo = await this.todosService.create(dto, files);
    return { todo };
  }

  @Get()
  async findAll() {
    const todos = await this.todosService.findAll();
    return { todos };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const todo = await this.todosService.findOne(id);
    return { todo };
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTodoDto,
    @UploadedFile(optionalImagePipe) file?: Express.Multer.File,
  ) {
    const todo = await this.todosService.update(id, dto, file);
    return { todo };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    await this.todosService.delete(id);
    return { message: 'Todo deleted successfully.' };
  }
}
