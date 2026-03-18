import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { I18nContext } from 'nestjs-i18n';
import { AuthService } from 'src/auth/auth.service';
import { UsersService } from 'src/modules/users/users.service';
import { PersonalAccessTokensModule } from '../personal_access_tokens/personal_access_tokens.module';
import { RegisterService } from '../register/register.service';
import { LoginController } from './login.controller';
import { LoginService } from './login.service';
import { usersProviders } from 'src/modules/admin/users/users.provider';

@Module({
  imports: [PersonalAccessTokensModule],
  controllers: [LoginController],
  providers: [
    LoginService,
    UsersService,
    AuthService,
    JwtService,
    RegisterService,
    I18nContext,
    ...usersProviders,
  ],
})
export class LoginModule {}
