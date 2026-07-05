import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { emptyToNull, trimText } from './todo-fields';

export class CreateTodoDto {
  @Transform(trimText)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @Transform(trimText)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description = '';

  @Transform(emptyToNull)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate must use the YYYY-MM-DD format',
  })
  @IsDateString({ strict: true })
  startDate!: string;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'deadline must use the YYYY-MM-DD format',
  })
  @IsDateString({ strict: true })
  deadline: string | null = null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  imageUrl?: string | null;
}
