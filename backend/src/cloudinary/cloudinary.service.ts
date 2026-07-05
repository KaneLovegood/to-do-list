import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type UploadedImage = {
  publicId: string;
  url: string;
};

type CloudinaryErrorResponse = {
  error?: {
    message?: string;
  };
};

type CloudinaryUploadResponse = CloudinaryErrorResponse & {
  public_id: string;
  secure_url: string;
};

@Injectable()
export class CloudinaryService {
  private readonly apiBaseUrl: string;
  private readonly authorization: string;

  constructor(configService: ConfigService) {
    const cloudName = configService.getOrThrow<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = configService.getOrThrow<string>('CLOUDINARY_API_KEY');
    const apiSecret = configService.getOrThrow<string>('CLOUDINARY_API_SECRET');

    this.apiBaseUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image`;
    this.authorization = `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`;
  }

  async uploadImage(file: Express.Multer.File): Promise<UploadedImage> {
    const form = new FormData();
    const bytes = Uint8Array.from(file.buffer);

    form.append(
      'file',
      new Blob([bytes], { type: file.mimetype }),
      file.originalname,
    );
    form.append('folder', 'todo-list');

    const result = await this.request<CloudinaryUploadResponse>('upload', form);

    return {
      publicId: result.public_id,
      url: result.secure_url,
    };
  }

  async deleteImage(publicId: string): Promise<void> {
    const form = new URLSearchParams({
      public_id: publicId,
      invalidate: 'true',
    });

    await this.request<CloudinaryErrorResponse>('destroy', form);
  }

  private async request<T>(
    action: 'upload' | 'destroy',
    body: BodyInit,
  ): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${this.apiBaseUrl}/${action}`, {
        method: 'POST',
        headers: {
          Authorization: this.authorization,
        },
        body,
      });
    } catch {
      throw new BadGatewayException('Could not reach Cloudinary.');
    }

    const payload = (await response
      .json()
      .catch(() => null)) as CloudinaryErrorResponse | null;

    if (!response.ok) {
      const detail = payload?.error?.message ?? `HTTP ${response.status}`;
      throw new BadGatewayException(`Cloudinary request failed: ${detail}`);
    }

    return payload as T;
  }
}
