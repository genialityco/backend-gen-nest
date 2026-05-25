import { Controller, Get, Put, Body } from '@nestjs/common';
import { PromoModalService } from './promo-modal.service';

@Controller('promo-modal')
export class PromoModalController {
  constructor(private readonly promoModalService: PromoModalService) {}

  @Get()
  async getConfig() {
    const data = await this.promoModalService.getConfig();
    return { data };
  }

  @Put()
  async updateConfig(@Body() config: Record<string, any>) {
    const data = await this.promoModalService.updateConfig(config);
    return { status: 'success', data };
  }
}
