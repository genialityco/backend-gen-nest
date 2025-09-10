import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import * as morgan from 'morgan';
import * as os from 'os';
import * as bodyParser from 'body-parser';

// Función para obtener la IP de la red local
function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalFilters(new HttpExceptionFilter());
  app.use(morgan('combined'));

  // Configura el límite de tamaño de la solicitud
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  const port = process.env.PORT || 3000;

  await app.listen(port, '0.0.0.0');

  // Mostrar la IP de la red local en lugar de localhost
  const localIp = getLocalNetworkIp();
  //const localIp = 'localhost';
  console.log(`Application is running on: http://${localIp}:${port}`);
}

bootstrap();
