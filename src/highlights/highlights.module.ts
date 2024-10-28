import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HighlightsService } from './highlights.service';
import { HighlightsController } from './highlights.controller';
import { HighlightSchema } from './schemas/highlight.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Highlight', schema: HighlightSchema }]),
  ],
  providers: [HighlightsService],
  controllers: [HighlightsController],
})
export class HighlightsModule {}
