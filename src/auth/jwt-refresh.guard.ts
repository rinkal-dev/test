import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { I18nService } from 'nestjs-i18n';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';

@Injectable()
export class JwtRefreshAuthGuard extends AuthGuard(JwtRefreshStrategy.key) {
  constructor(private i18n: I18nService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Add your custom authentication logic here
    // for example, call super.logIn(request) to establish a session.
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      throw new UnauthorizedException({
        message: (err && err.message) || this.i18n.t('auth.invalid_token'),
      });
    }

    return user;
  }
}
