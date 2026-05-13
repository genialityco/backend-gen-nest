import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class PromoModalService {
  constructor(
    @InjectModel('PromoModal') private promoModalModel: Model<any>,
  ) {}

  async getConfig(): Promise<Record<string, any>> {
    const doc = await this.promoModalModel.findOne().exec();
    return doc ? doc.toObject() : {};
  }

  async updateConfig(config: Record<string, any>): Promise<Record<string, any>> {
    const doc = await this.promoModalModel.findOneAndUpdate(
      {},
      { $set: config },
      { new: true, upsert: true },
    ).exec();
    return doc.toObject();
  }
}
