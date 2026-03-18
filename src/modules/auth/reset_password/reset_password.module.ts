import { Module } from '@nestjs/common';
import { ResetPasswordController } from './reset_password.controller';
import { ResetPasswordService } from './reset_password.service';
import { usersProviders } from 'src/modules/admin/users/users.provider';

@Module({
  imports: [],
  controllers: [ResetPasswordController],
  providers: [ResetPasswordService, ...usersProviders],
})
export class ResetPasswordModule {}
