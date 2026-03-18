import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  constructor(private i18n: I18nService) {
    super();
  }

  handleRequest(err, user, info) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      throw new UnauthorizedException({
        message: (err && err.message) || this.i18n.t('auth.failed'),
      });
    }
    return user;
  }
}
