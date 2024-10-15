import { Module } from '@nestjs/common';
import { SpeakersService } from './speakers.service';
import { SpeakersController } from './speakers.controller';
import { SpeakerSchema } from './schemas/speakers.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Speaker', schema: SpeakerSchema }]),
  ],
  controllers: [SpeakersController],
  providers: [SpeakersService],
})
export class SpeakersModule {}
