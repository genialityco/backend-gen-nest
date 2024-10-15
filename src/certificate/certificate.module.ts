import { Module } from '@nestjs/common';
import { CertificateService } from './certificate.service';
import { CertificateController } from './certificate.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CertificateSchema } from './schemas/certificate.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Certificate', schema: CertificateSchema },
    ]),
  ],
  providers: [CertificateService],
  controllers: [CertificateController],
})
export class CertificateModule {}
