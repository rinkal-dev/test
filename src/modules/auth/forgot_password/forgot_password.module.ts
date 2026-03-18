import { Module } from '@nestjs/common';
import { UsersModule } from 'src/modules/users/users.module';
import { ForgotPasswordController } from './forgot_password.controller';
import { ForgotPasswordService } from './forgot_password.service';
import { usersProviders } from 'src/modules/admin/users/users.provider';

@Module({
  imports: [UsersModule],
  controllers: [ForgotPasswordController],
  providers: [ForgotPasswordService, ...usersProviders],
})
export class ForgotPasswordModule {}
