import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromoModalController } from './promo-modal.controller';
import { PromoModalService } from './promo-modal.service';
import { PromoModalSchema } from './schemas/promo-modal.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'PromoModal', schema: PromoModalSchema }]),
  ],
  providers: [PromoModalService],
  controllers: [PromoModalController],
})
export class PromoModalModule {}
