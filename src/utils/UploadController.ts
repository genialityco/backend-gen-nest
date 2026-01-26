import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { initializeFirebaseAdmin } from 'src/config/firebase-admin.config';

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

@Controller('upload')
export class UploadController {
  constructor(private readonly firebaseAdminService: initializeFirebaseAdmin) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    const bucket = this.firebaseAdminService
      .getStorage()
      .bucket('global-auth-49737.appspot.com');

    const safeName = sanitizeFileName(file.originalname);
    const objectPath = `Y${Date.now()}-${safeName}`;
    const blob = bucket.file(objectPath);

    const token = uuidv4();

    await blob.save(file.buffer, {
      gzip: true,
      resumable: false,
      metadata: {
        contentType: file.mimetype || 'image/jpeg',
        contentDisposition: 'inline',
        cacheControl: 'public, max-age=31536000',
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
      },
    });

    const encoded = encodeURIComponent(objectPath);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encoded}?alt=media&token=${token}`;

    return { imageUrl: url };
  }

  @Post('document')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    const bucket = this.firebaseAdminService
      .getStorage()
      .bucket('global-auth-49737.appspot.com');

    const safeName = sanitizeFileName(file.originalname);
    const objectPath = `D${Date.now()}-${safeName}`;
    const blob = bucket.file(objectPath);

    const token = uuidv4();

    await blob.save(file.buffer, {
      gzip: true,
      resumable: false,
      metadata: {
        // Si llega vacío, al menos no rompes:
        contentType: file.mimetype || 'application/octet-stream',
        // inline es clave para mejor comportamiento con iOS/embeds
        contentDisposition: 'inline',
        cacheControl: 'public, max-age=31536000',
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
      },
    });

    const encoded = encodeURIComponent(objectPath);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encoded}?alt=media&token=${token}`;

    return { url, documentUrl: url };
  }
}
