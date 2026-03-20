import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class AuthService {
  // Verificar el token enviado desde el frontend
  async verifyIdToken(idToken: string): Promise<any> {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      throw new UnauthorizedException('Token inválido o expirado', error);
    }
  }

  // Obtener información del usuario desde Firebase
  async getUser(uid: string) {
    return admin.auth().getUser(uid);
  }

  async resetPassword(userId: string, newPassword: string): Promise<void> {
    try {
      await admin.auth().updateUser(userId, { password: newPassword });
    } catch (error) {
      throw new Error(`Error al restablecer la contraseña: ${error.message}`);
    }
  }
}
