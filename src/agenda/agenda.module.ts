import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgendaService } from './agenda.service';
import { AgendaController } from './agenda.controller';
import { AgendaSchema } from './schemas/agenda.schema';
import { EventModule } from '../event/event.module';
import { SpeakersModule } from 'src/speakers/speakers.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Agenda', schema: AgendaSchema }]),
    EventModule,
    SpeakersModule,
  ],
  providers: [AgendaService],
  controllers: [AgendaController],
})
export class AgendaModule {}
