import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const GENDER_OPTIONS = [
  'female',
  'male',
  'non-binary',
  'other',
  'prefer-not-to-say',
] as const;

export type Gender = (typeof GENDER_OPTIONS)[number];

export class UpdateProfileDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString()
  @MinLength(1, { message: 'Please enter the name you would like us to use.' })
  @MaxLength(50, { message: 'Name must not exceed 50 characters.' })
  displayName?: string;

  @IsOptional()
  @IsIn(GENDER_OPTIONS, { message: 'Please select a valid gender option.' })
  gender?: Gender;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Age must be a whole number.' })
  @Min(1, { message: 'Age must be at least 1.' })
  @Max(120, { message: 'Age must not exceed 120.' })
  age?: number;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(8, { message: 'Current password must be at least 8 characters.' })
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters.' })
  @MaxLength(128, { message: 'New password must not exceed 128 characters.' })
  newPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  passwordConfirmation!: string;
}
