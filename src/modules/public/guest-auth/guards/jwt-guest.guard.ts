/**
 * ============================================
 * JWT GUEST GUARD
 * ============================================
 *
 * Guard for protecting guest-only routes.
 * Validates JWT tokens and ensures the user is a guest.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getEnvironmentData } from 'src/helpers/general';
import { GuestAuthService } from '../guest-auth.service';

@Injectable()
export class JwtGuestGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private guestAuthService: GuestAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      // Verify the token
      const payload = this.jwtService.verify(token, {
        secret: getEnvironmentData('JWT_SECRET'),
      });

      // Ensure it's a guest token
      if (payload.type !== 'guest') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Validate the guest exists and is active
      const guest = await this.guestAuthService.validateGuestToken(payload);

      if (!guest) {
        throw new UnauthorizedException('Guest not found or inactive');
      }

      // Attach guest to request
      request.guest = guest;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
