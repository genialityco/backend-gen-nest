import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationSchema } from './schemas/organization.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Organization', schema: OrganizationSchema }])],
  providers: [OrganizationService],
  controllers: [OrganizationController]
})
export class OrganizationModule {}
