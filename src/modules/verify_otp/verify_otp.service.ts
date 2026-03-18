import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { I18n, I18nContext } from 'nestjs-i18n';

@Injectable()
export class VerifyOtpService {
  constructor(@I18n() private i18n: I18nContext) {}

  throwIfOTPExpired(time: Date): void | never {
    if (time.valueOf() < Date.now()) {
      throw new UnprocessableEntityException(['auth.otp.token_expired']);
    }
  }
}
