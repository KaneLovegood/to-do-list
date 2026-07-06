import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { Otp } from './schemas/otp.schema';
import type { UpdateProfileDto } from './dto/profile.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(Otp.name) private readonly otpModel: Model<Otp>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async register(
    email: string,
    password: string,
    passwordConfirmation: string,
  ): Promise<void> {
    if (password !== passwordConfirmation) {
      throw new BadRequestException('Passwords do not match.');
    }

    const existingUser = await this.usersService.findForAuthentication(email);
    if (existingUser?.isEmailVerified && existingUser.passwordHash) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await this.hashPassword(password);
    await this.usersService.prepareRegistration(email, passwordHash);
    await this.generateAndSendOtp(email);
  }

  private async generateAndSendOtp(email: string): Promise<void> {
    const cleanEmail = email.toLowerCase().trim();

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // Delete any existing OTP for this email
    await this.otpModel.deleteMany({ email: cleanEmail }).exec();

    // Save the new OTP
    await this.otpModel.create({
      email: cleanEmail,
      otpHash: this.hashOtp(cleanEmail, otp),
      expiresAt,
    });

    // Send the OTP via Brevo API
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    const senderEmail =
      this.configService.get<string>('BREVO_SENDER_EMAIL') ??
      'no-reply@todoplanner.com';
    const senderName =
      this.configService.get<string>('BREVO_SENDER_NAME') ?? 'Todo planner';

    if (!apiKey) {
      this.logger.error(
        'BREVO_API_KEY is not defined in environment variables.',
      );
      throw new InternalServerErrorException(
        'Email service configuration error.',
      );
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: cleanEmail }],
          subject: `${otp} is your Todo planner verification code`,
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f2eaea; border-radius: 8px; background-color: #faf7f2;">
              <h2 style="color: #11110f; border-bottom: 2px solid #f87777; padding-bottom: 10px;">Todo planner Verification</h2>
              <p style="color: #696563; font-size: 16px;">Hello,</p>
              <p style="color: #696563; font-size: 16px;">Use the following verification code to verify your Todo planner account. This code is valid for 5 minutes.</p>
              <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #f87777; background-color: #f2eaea; padding: 10px 20px; border-radius: 4px; border: 1px dashed #f87777;">${otp}</span>
              </div>
              <p style="color: #696563; font-size: 14px;">If you did not request this code, please ignore this email.</p>
              <hr style="border: 0; border-top: 1px solid #f2eaea; margin-top: 30px;" />
              <p style="color: #696563; font-size: 12px; text-align: center;">Todo planner</p>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          `Brevo API responded with status ${response.status}: ${errorBody}`,
        );
        throw new InternalServerErrorException(
          'Failed to send verification email.',
        );
      }
    } catch (err) {
      this.logger.error('Failed to send OTP email', err);
      throw new InternalServerErrorException(
        'Failed to send verification email.',
      );
    }
  }

  async verifyRegistration(email: string, otpCode: string): Promise<void> {
    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otpCode.trim();

    const pendingUser =
      await this.usersService.findForAuthentication(cleanEmail);
    if (!pendingUser?.pendingPasswordHash) {
      throw new BadRequestException('No pending registration was found.');
    }

    const otpDoc = await this.otpModel
      .findOne({
        email: cleanEmail,
        otpHash: this.hashOtp(cleanEmail, cleanOtp),
        expiresAt: { $gt: new Date() },
      })
      .exec();

    if (!otpDoc) {
      throw new BadRequestException('Invalid or expired verification code.');
    }

    // Delete OTP after successful verification to prevent reuse
    await this.otpModel.deleteOne({ _id: otpDoc._id }).exec();

    const user = await this.usersService.completeRegistration(cleanEmail);
    if (!user) {
      throw new BadRequestException('Registration could not be completed.');
    }
  }

  async login(
    email: string,
    password: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    userId: string;
    displayName: string | null;
    gender: string | null;
    age: number | null;
    avatarUrl: string | null;
  }> {
    const user = await this.usersService.findForAuthentication(email);

    if (
      !user?.isEmailVerified ||
      !user.passwordHash ||
      !(await this.verifyPassword(password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const payload = { sub: user._id.toString(), email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      userId: user._id.toString(),
      displayName: user.displayName ?? null,
      gender: user.gender ?? null,
      age: user.age ?? null,
      avatarUrl: user.avatarUrl ?? null,
    };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user?.isEmailVerified) {
      throw new NotFoundException('User profile not found.');
    }

    return {
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName ?? null,
      gender: user.gender ?? null,
      age: user.age ?? null,
      avatarUrl: user.avatarUrl ?? null,
    };
  }

  async updateProfile(userId: string, profile: UpdateProfileDto) {
    if (Object.keys(profile).length === 0) {
      throw new BadRequestException(
        'Provide at least one profile field to update.',
      );
    }

    const user = await this.usersService.updateProfile(userId, profile);
    if (!user?.isEmailVerified) {
      throw new NotFoundException('User profile not found.');
    }

    return {
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName ?? null,
      gender: user.gender ?? null,
      age: user.age ?? null,
      avatarUrl: user.avatarUrl ?? null,
    };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Each image size must be less than 5MB.');
    }
    if (!/^(image\/(jpeg|png|webp|gif))$/.test(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, WEBP, and GIF images are allowed.');
    }
    const uploaded = await this.cloudinaryService.uploadImage(file);
    const user = await this.usersService.updateProfile(userId, {
      avatarUrl: uploaded.url,
    });
    if (!user) {
      throw new NotFoundException('User profile not found.');
    }
    return {
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName ?? null,
      gender: user.gender ?? null,
      age: user.age ?? null,
      avatarUrl: user.avatarUrl ?? null,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    passwordConfirmation: string,
  ): Promise<void> {
    if (newPassword !== passwordConfirmation) {
      throw new BadRequestException('New passwords do not match.');
    }
    if (currentPassword === newPassword) {
      throw new BadRequestException(
        'Choose a password you have not used here.',
      );
    }

    const user = await this.usersService.findByIdForAuthentication(userId);
    if (
      !user?.passwordHash ||
      !(await this.verifyPassword(currentPassword, user.passwordHash))
    ) {
      throw new BadRequestException('Current password is incorrect.');
    }

    const passwordHash = await this.hashPassword(newPassword);
    const updatedUser = await this.usersService.updatePassword(
      userId,
      passwordHash,
    );
    if (!updatedUser) {
      throw new NotFoundException('User profile not found.');
    }
  }

  async verifyAccessToken(
    token: string,
  ): Promise<{ sub: string; email: string; iat?: number }> {
    try {
      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        iat?: number;
      }>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
      const user = await this.usersService.findById(payload.sub);
      if (
        !user?.isEmailVerified ||
        this.wasIssuedBeforePasswordChange(payload.iat, user.passwordChangedAt)
      ) {
        throw new UnauthorizedException('Access token is no longer valid.');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid access token.');
    }
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        iat?: number;
      }>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user?.isEmailVerified) {
        throw new UnauthorizedException('Account is not available.');
      }
      if (
        this.wasIssuedBeforePasswordChange(payload.iat, user.passwordChangedAt)
      ) {
        throw new UnauthorizedException('Refresh token is no longer valid.');
      }

      const newPayload = { sub: payload.sub, email: payload.email };
      const accessToken = this.jwtService.sign(newPayload, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: '15m',
      });

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  private hashOtp(email: string, otp: string): string {
    return createHmac(
      'sha256',
      this.configService.getOrThrow<string>('JWT_SECRET'),
    )
      .update(`${email}:${otp}`)
      .digest('hex');
  }

  private wasIssuedBeforePasswordChange(
    issuedAt: number | undefined,
    passwordChangedAt: Date | undefined,
  ): boolean {
    if (!passwordChangedAt) return false;
    if (!issuedAt) return true;
    return issuedAt * 1000 <= passwordChangedAt.getTime();
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = await this.derivePasswordKey(password, salt);
    return `scrypt:${salt}:${derivedKey.toString('hex')}`;
  }

  private async verifyPassword(
    password: string,
    encodedHash: string,
  ): Promise<boolean> {
    const [algorithm, salt, storedKeyHex] = encodedHash.split(':');
    if (algorithm !== 'scrypt' || !salt || !storedKeyHex) {
      return false;
    }

    const storedKey = Buffer.from(storedKeyHex, 'hex');
    const suppliedKey = await this.derivePasswordKey(password, salt);
    return (
      storedKey.length === suppliedKey.length &&
      timingSafeEqual(storedKey, suppliedKey)
    );
  }

  private derivePasswordKey(password: string, salt: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      scrypt(password, salt, 64, (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(derivedKey);
      });
    });
  }
}
