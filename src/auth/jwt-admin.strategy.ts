import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PersonalAccessTokensService } from 'src/modules/auth/personal_access_tokens/personal_access_tokens.service';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { getEnvironmentData } from 'src/helpers/general';
import { AdminAuthService } from 'src/modules/admin/admin-auth/admin-auth.service';
import { ADMIN_TOKENABLE_TYPE } from 'src/config/constants';
import { Roles } from 'src/models/Roles';
import { Permissions } from 'src/models/Permissions';

@Injectable()
export class JwtAdminStrategy extends PassportStrategy(Strategy, 'jwt-admin') {
  constructor(
    private personalAccessToken: PersonalAccessTokensService,
    private adminAuth: AdminAuthService,
    private authService: AuthService,
    private i18n: I18nService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getEnvironmentData('JWT_SECRET'),
      requestIdleCallback: true,
      passReqToCallback: true,
    });
  }

  async validate(req: Request) {
    const token = <string>req.headers['authorization'];

    const payload = this.authService.getCurrentPersonalTokenID(token);

    const personalAccessToken: any =
      await this.personalAccessToken.personalAccessTokensRepository.findOne({
        where: {
          uuid: payload.personal_access_token_uuid,
          tokenable_type: ADMIN_TOKENABLE_TYPE,
        },
        raw: true,
      });

    if (!personalAccessToken) {
      throw new UnauthorizedException({
        message: this.i18n.t('auth.invalid_token'),
      });
    }

    // Load admin with roles and permissions for authorization checks
    const admin = await this.adminAuth.adminRepository.findOne({
      where: { id: payload.sub },
      include: [
        {
          model: Roles,
          as: 'roles',
          include: [
            {
              model: Permissions,
              as: 'permissions',
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
    });

    if (!admin) {
      throw new UnauthorizedException({
        message: this.i18n.t('auth.invalid_token'),
      });
    }

    if (admin.is_active === false) {
      throw new ForbiddenException(
        this.i18n.t('auth.inactive_account', {
          lang: req.headers['accept-language'] ?? 'en',
        }),
      );
    }

    return admin;
  }
}
