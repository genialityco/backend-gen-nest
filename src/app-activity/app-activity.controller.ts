import { Controller, Get, Query } from '@nestjs/common';
import { ResponseDto } from 'src/common/response.dto';
import { AppActivityService } from './app-activity.service';

@Controller('app-activity')
export class AppActivityController {
  constructor(private readonly appActivityService: AppActivityService) {}

  // GET /app-activity/stats?from=YYYY-MM-DD&to=YYYY-MM-DD (por defecto, ultimos 30 dias)
  @Get('stats')
  async stats(@Query('from') from?: string, @Query('to') to?: string) {
    const result = await this.appActivityService.stats(from, to);
    return new ResponseDto('success', 'Estadísticas de actividad', result);
  }

  // GET /app-activity/realtime -> usuarios activos en los ultimos 30 minutos (GA4)
  @Get('realtime')
  async realtime() {
    const result = await this.appActivityService.realtime();
    return new ResponseDto('success', 'Usuarios activos en tiempo real', result);
  }
}
