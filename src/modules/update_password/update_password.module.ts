import { Module } from '@nestjs/common';
import { UpdatePasswordController } from './update_password.controller';
import { UpdatePasswordService } from './update_password.service';

@Module({
  controllers: [UpdatePasswordController],
  providers: [UpdatePasswordService],
})
export class UpdatePasswordModule {}
