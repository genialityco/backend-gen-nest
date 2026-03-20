import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class InjectUserInterceptor implements NestInterceptor {
  private logger = new Logger('InjectUserInterceptor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    this.logger.log(`Request user:`, request.user);
    this.logger.log(`Request body before:`, request.body);

    // Verificar que req.user exista
    if (!request.user || !request.user.uid) {
      throw new BadRequestException('No authenticated user found');
    }

    // Inyectar el userId del usuario autenticado en el body si no existe
    if (request.body && !request.body.userId) {
      request.body.userId = request.user.uid;
      this.logger.log(`UserId injected: ${request.user.uid}`);
    }

    this.logger.log(`Request body after:`, request.body);

    return next.handle();
  }
}
