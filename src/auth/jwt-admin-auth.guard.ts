import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class JwtAdminAuthGuard extends AuthGuard('jwt-admin') {
  constructor(private i18n: I18nService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Add your custom authentication logic here
    // for example, call super.logIn(request) to establish a session.
    return super.canActivate(context);
  }

  handleRequest(err, admin, info) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !admin) {
      throw new UnauthorizedException({
        message: (err && err.message) || this.i18n.t('auth.invalid_token'),
      });
    }

    return admin;
  }
}
