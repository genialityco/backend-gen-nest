import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';

const SESSION_MS = 12 * 60 * 60 * 1000;
const digest = (value: string) => createHash('sha256').update(value).digest();
const sign = (expiresAt: string, password: string) =>
  createHmac('sha256', password)
    .update(`certificate-admin:${expiresAt}`)
    .digest('hex');

export function createCertificateAdminSession(password: string) {
  const expected = process.env.CERTIFICATE_ADMIN_PASSWORD;
  if (!expected) {
    throw new ServiceUnavailableException(
      'El acceso al panel de certificados no está configurado',
    );
  }
  if (
    typeof password !== 'string' ||
    !timingSafeEqual(digest(password), digest(expected))
  ) {
    throw new UnauthorizedException('Contraseña incorrecta');
  }

  const expiresAt = Date.now() + SESSION_MS;
  return {
    expiresAt,
    token: `${expiresAt}.${sign(String(expiresAt), expected)}`,
  };
}

@Injectable()
export class CertificateAdminSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { authorization } = context
      .switchToHttp()
      .getRequest<Request>().headers;
    const password = process.env.CERTIFICATE_ADMIN_PASSWORD;
    const match = /^Bearer (\d{13})\.([a-f0-9]{64})$/.exec(authorization ?? '');
    if (
      password &&
      match &&
      Number(match[1]) > Date.now() &&
      timingSafeEqual(
        Buffer.from(match[2], 'hex'),
        Buffer.from(sign(match[1], password), 'hex'),
      )
    ) {
      return true;
    }
    throw new UnauthorizedException(
      'La sesión del panel no es válida o expiró',
    );
  }
}
