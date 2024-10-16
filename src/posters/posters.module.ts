import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostersService } from './posters.service';
import { PostersController } from './posters.controller';
import { PosterSchema } from './schemas/poster.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Poster', schema: PosterSchema }]),
  ],
  providers: [PostersService],
  controllers: [PostersController],
})
export class PostersModule {}
