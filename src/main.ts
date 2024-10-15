import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import * as morgan from 'morgan';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Usar filtros globales para manejo de excepciones
  app.useGlobalFilters(new HttpExceptionFilter());

  // Middleware de morgan para logging
  app.use(morgan('combined'));

  // Usar puerto desde variables de entorno
  const port = process.env.PORT || 3000;

  // Iniciar el servidor en la dirección 0.0.0.0 y el puerto dinámico
  await app.listen(port, '0.0.0.0');

  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
