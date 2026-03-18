import { Module } from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import { UsersModule } from '../users/users.module';
import { SendOtpController } from './send_otp.controller';
import { SendOtpService } from './send_otp.service';

@Module({
  imports: [UsersModule],
  controllers: [SendOtpController],
  providers: [SendOtpService, I18nContext],
})
export class SendOtpModule {}
