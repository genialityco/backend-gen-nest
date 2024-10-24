import {
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
    BadRequestException,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { initializeFirebaseAdmin } from 'src/config/firebase-admin.config';
  
  @Controller('upload')
  export class UploadController {
    constructor(private readonly firebaseAdminService: initializeFirebaseAdmin) {}
  
    @Post('image')
    @UseInterceptors(FileInterceptor('file'))
    async uploadImage(@UploadedFile() file: Express.Multer.File) {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }
  
      const bucket = this.firebaseAdminService.getStorage().bucket();
      const blob = bucket.file(Date.now() + '-' + file.originalname);
  
      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });
  
      return new Promise((resolve, reject) => {
        blobStream.on('error', (error) => reject(`Unable to upload image, something went wrong: ${error.message}`));
        blobStream.on('finish', () => {
          // Get public URL
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
          resolve({ imageUrl: publicUrl });
        });
  
        blobStream.end(file.buffer);
      });
    }
  }
  