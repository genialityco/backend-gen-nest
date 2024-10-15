import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authorization.split(' ')[1];
    const decodedToken = await this.authService.verifyIdToken(token);

    if (!decodedToken) {
      throw new UnauthorizedException('Invalid token');
    }
    // Agregar el token decodificado a la solicitud para que esté disponible en los controladores
    request.user = decodedToken;
    return true;
  }
}
