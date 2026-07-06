import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import {
  CurrentUser,
  AuthenticatedUser,
} from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ChangePasswordDto, UpdateProfileDto } from './dto/profile.dto';

class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters.' })
  password!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  passwordConfirmation!: string;
}

class VerifyRegistrationDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Verification code must be 6 digits.' })
  otp!: string;
}

class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(@Body() dto: RegisterDto) {
    await this.authService.register(
      dto.email,
      dto.password,
      dto.passwordConfirmation,
    );
    return { success: true, message: 'Verification code sent to your email.' };
  }

  @Post('verify-registration')
  @HttpCode(HttpStatus.OK)
  async verifyRegistration(@Body() dto: VerifyRegistrationDto) {
    await this.authService.verifyRegistration(dto.email, dto.otp);
    return {
      success: true,
      message: 'Email verified. You can now log in.',
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const loginData = await this.authService.login(dto.email, dto.password);

    this.setRefreshTokenCookie(response, loginData.refreshToken);

    return {
      user: {
        id: loginData.userId,
        email: dto.email.toLowerCase().trim(),
        displayName: loginData.displayName,
        gender: loginData.gender,
        age: loginData.age,
      },
      accessToken: loginData.accessToken,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const refreshToken = cookies?.refreshToken;
    if (typeof refreshToken !== 'string') {
      response.status(HttpStatus.UNAUTHORIZED);
      return { message: 'Refresh token not found in cookies.' };
    }

    try {
      const data = await this.authService.refresh(refreshToken);
      return data;
    } catch {
      // Clear invalid cookie
      response.clearCookie('refreshToken', { path: '/' });
      response.status(HttpStatus.UNAUTHORIZED);
      return { message: 'Invalid or expired refresh token.' };
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('refreshToken', { path: '/' });
    return { success: true, message: 'Logged out successfully.' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return { user: await this.authService.getProfile(user.id) };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return {
      user: await this.authService.updateProfile(user.id, dto),
    };
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar', {
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1,
    },
  }))
  async uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^(image\/(jpeg|png|webp|gif))$/ })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: true,
        }),
    )
    file: Express.Multer.File,
  ) {
    return {
      user: await this.authService.uploadAvatar(user.id, file),
    };
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
      dto.passwordConfirmation,
    );
    response.clearCookie('refreshToken', { path: '/' });
    return {
      success: true,
      message: 'Password updated. Please sign in again.',
    };
  }

  private setRefreshTokenCookie(response: Response, refreshToken: string) {
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
}
