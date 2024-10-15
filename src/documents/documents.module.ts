import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentService } from './documents.service';
import { DocumentSchema } from './schemas/document.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Document', schema: DocumentSchema }]),
  ],
  controllers: [DocumentsController],
  providers: [DocumentService],
})
export class DocumentsModule {}
