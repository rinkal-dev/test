import { Module } from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import { SendOtpService } from '../send_otp/send_otp.service';
import { UsersModule } from '../users/users.module';
import { VerifyOtpController } from './verify_otp.controller';
import { VerifyOtpService } from './verify_otp.service';

@Module({
  imports: [UsersModule],
  controllers: [VerifyOtpController],
  providers: [VerifyOtpService, I18nContext, SendOtpService],
})
export class VerifyOtpModule {}
