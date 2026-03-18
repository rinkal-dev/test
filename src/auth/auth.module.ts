import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { I18nContext } from 'nestjs-i18n';
import { PersonalAccessTokensModule } from 'src/modules/auth/personal_access_tokens/personal_access_tokens.module';
import { UsersModule } from 'src/modules/users/users.module';
import { AuthService } from './auth.service';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { JwtAdminStrategy } from './jwt-admin.strategy';
import { getEnvironmentData } from 'src/helpers/general';
import { AdminAuthModule } from 'src/modules/admin/admin-auth/admin-auth.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    PersonalAccessTokensModule,
    AdminAuthModule,
    JwtModule.register({
      secret: getEnvironmentData('JWT_SECRET'),
      signOptions: {
        expiresIn: getEnvironmentData('JWT_ACCESS_TIME'),
      },
    }),
  ],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    JwtAdminStrategy,
    JwtRefreshStrategy,
    I18nContext,
  ],
  exports: [AuthService],
})
export class AuthModule {}
