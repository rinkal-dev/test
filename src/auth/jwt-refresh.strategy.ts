import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PersonalAccessTokensService } from 'src/modules/auth/personal_access_tokens/personal_access_tokens.service';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { getEnvironmentData } from 'src/helpers/general';
import { USER_TOKENABLE_TYPE } from 'src/config/constants';
import { Users } from 'src/models';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  static key = 'jwt-refresh';

  constructor(
    private personalAccessToken: PersonalAccessTokensService,
    private authService: AuthService,
    private i18n: I18nService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromHeader('refresh-token'),
      ignoreExpiration: false,
      secretOrKey: getEnvironmentData('JWT_SECRET'),
      requestIdleCallback: true,
      passReqToCallback: true,
    });
  }

  async validate(req: Request) {
    const token = <string>req.headers['refresh-token'];

    const payload = this.authService.decodeJwtToken(token);

    // const personalAccessToken: any =
    //   await this.personalAccessToken.personalAccessTokenModel
    //     .findOne({
    //       _id: payload.personal_access_token_id,
    //       refresh_token: token,
    //     })
    //     .populate({
    //       path: 'user',
    //       model: 'User',
    //       match: { _id: payload.sub },
    //     });

    const personalAccessToken: any =
      await this.personalAccessToken.personalAccessTokensRepository.findOne({
        where: {
          uuid: payload.personal_access_token_uuid,
          tokenable_type: USER_TOKENABLE_TYPE,
        },
        include: {
          model: Users,
        },
      });

    if (!personalAccessToken) {
      throw new UnauthorizedException({
        message: this.i18n.t('auth.invalid_token'),
      });
    }

    if (personalAccessToken?.user?.is_active === false) {
      throw new UnauthorizedException(
        this.i18n.t('auth.inactive_account', {
          lang: req.headers['accept-language'] ?? 'en',
        }),
      );
    }

    return personalAccessToken?.user;
  }
}
