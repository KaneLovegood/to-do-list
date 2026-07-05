import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { Todo, TodoSchema } from './schemas/todo.schema';
import { TodosController } from './todos.controller';
import { TodosRepository } from './todos.repository';
import { TodosService } from './todos.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Todo.name, schema: TodoSchema }]),
    CloudinaryModule,
  ],
  controllers: [TodosController],
  providers: [TodosRepository, TodosService],
})
export class TodosModule {}
