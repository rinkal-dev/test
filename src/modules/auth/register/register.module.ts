import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/auth/auth.service';
import { UsersService } from 'src/modules/users/users.service';
import { RegisterController } from './register.controller';
import { RegisterService } from './register.service';
import { PersonalAccessTokensModule } from '../personal_access_tokens/personal_access_tokens.module';
import { usersProviders } from 'src/modules/admin/users/users.provider';

@Module({
  imports: [PersonalAccessTokensModule],
  controllers: [RegisterController],
  providers: [
    UsersService,
    AuthService,
    JwtService,
    RegisterService,
    ...usersProviders,
  ],
})
export class RegisterModule {}
