import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { initializeFirebaseAdmin } from 'src/config/firebase-admin.config';
import { diskStorage, memoryStorage } from 'multer';

@Controller('upload')
export class UploadController {
  constructor(private readonly firebaseAdminService: initializeFirebaseAdmin) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const bucket = this.firebaseAdminService.getStorage().bucket();
    const blob = bucket.file('Y' + Date.now() + '-' + file.originalname);

    await blob.save(file.buffer, {
      contentType: file.mimetype,
      gzip: true,
    });

    await blob.makePublic();

    return new Promise((resolve, reject) => {
      // Get public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      resolve({ imageUrl: publicUrl });
    });
  }
}
