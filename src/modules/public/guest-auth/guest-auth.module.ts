/**
 * ============================================
 * GUEST AUTH MODULE
 * ============================================
 *
 * Module for guest authentication.
 * GP-002: Guest Login API
 * GP-003: Guest Session Management
 *
 * Uses repository abstraction to support both Sequelize and Supabase.
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GuestAuthController } from './guest-auth.controller';
import { GuestAuthService } from './guest-auth.service';
import {
  GuestAuthRepositoryProvider,
  GuestAuthModelProviders,
} from './guest-auth.provider';
import { JwtGuestGuard } from './guards/jwt-guest.guard';
import { getEnvironmentData } from 'src/helpers/general';

@Module({
  imports: [
    JwtModule.register({
      secret: getEnvironmentData('JWT_SECRET'),
      signOptions: {
        expiresIn: getEnvironmentData('JWT_ACCESS_TIME') || '24h',
      },
    }),
  ],
  controllers: [GuestAuthController],
  providers: [
    GuestAuthService,
    JwtGuestGuard,
    GuestAuthRepositoryProvider,
    ...GuestAuthModelProviders,
  ],
  exports: [GuestAuthService, JwtGuestGuard, JwtModule],
})
export class GuestAuthModule {}
