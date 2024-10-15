import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SurveyService } from './survey.service';
import { SurveyController } from './survey.controller';
import { SurveySchema } from './schemas/survey.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Survey', schema: SurveySchema }]),
  ],
  providers: [SurveyService],
  controllers: [SurveyController],
})
export class SurveyModule {}
