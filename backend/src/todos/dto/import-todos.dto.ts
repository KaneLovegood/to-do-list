import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTodoDto } from './create-todo.dto';

export class ImportTodosDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTodoDto)
  todos!: CreateTodoDto[];
}
