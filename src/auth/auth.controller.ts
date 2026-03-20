import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('reset-password')
  async resetPassword(@Body('userId') userId: string, @Body('newPassword') newPassword: string): Promise<{ message: string }> {
    await this.authService.resetPassword(userId, newPassword);
    return { message: 'Contraseña restablecida exitosamente' };
  }
}