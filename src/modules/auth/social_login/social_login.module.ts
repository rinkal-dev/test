import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/auth/auth.service';
import { UsersService } from 'src/modules/users/users.service';
import { PersonalAccessTokensModule } from '../personal_access_tokens/personal_access_tokens.module';
import { SocialLoginController } from './social_login.controller';
import { SocialLoginService } from './social_login.service';
import { usersProviders } from 'src/modules/admin/users/users.provider';
import { socialLoginsProviders } from './social_login.provider';

@Module({
  imports: [PersonalAccessTokensModule],
  controllers: [SocialLoginController],
  providers: [
    UsersService,
    AuthService,
    JwtService,
    SocialLoginService,
    ...usersProviders,
    ...socialLoginsProviders,
  ],
})
export class SocialLoginModule {}
