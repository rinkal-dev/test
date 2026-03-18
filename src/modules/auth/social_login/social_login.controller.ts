import {
  Body,
  Controller,
  HttpStatus,
  Ip,
  Post,
  Res,
  UnprocessableEntityException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { pick } from 'lodash';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { I18n, I18nContext } from 'nestjs-i18n';
import { AuthService } from 'src/auth/auth.service';
import { UsersService } from 'src/modules/users/users.service';
import { PersonalAccessTokensService } from '../personal_access_tokens/personal_access_tokens.service';
import { SocialLoginDTO } from 'src/dto/social_login.dto';
import { generateString } from 'src/helpers/general';
import { SocialLoginService } from './social_login.service';
import {
  ApiConsumes,
  ApiHeaders,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { consumers, headers, response, tags } from 'src/swagger/Base';
import { LoginResponse } from '../../../swagger/Login';
import { USER_TOKENABLE_TYPE } from 'src/config/constants';

@Controller({
  version: '1',
})
export class SocialLoginController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
    private socialLoginService: SocialLoginService,
    private personalAccessTokensService: PersonalAccessTokensService,
  ) {}

  @ApiTags(tags.USER_AUTHENTICATION)
  @ApiOperation({
    operationId: 'socialLogin',
    summary: 'Make the user login using socialite.',
  })
  @ApiConsumes(consumers.formURLEncoded)
  @ApiHeaders([headers.accept, headers.accept_language])
  @ApiOkResponse({
    type: LoginResponse,
  })
  @ApiUnauthorizedResponse(response.unauthorized)
  @ApiInternalServerErrorResponse(response.badRequest)
  @ApiUnprocessableEntityResponse(response.validationException)
  @ApiServiceUnavailableResponse(response.serverMaintenanceException)
  @Post('social-login')
  async socialLogin(
    @Body() req: SocialLoginDTO,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
  ) {
    try {
      const { email, ...data } = JSON.parse(req.social_data);

      let user = await this.usersService.findOne({ email: email });

      if (!user) {
        user = await this.usersService.create({
          uuid: uuidv4(),
          password: await bcrypt.hash(generateString(8), 10),
          email: email,
          username: this.socialLoginService.usernameFromEmail(email),
          name: data.name ?? data.nickname ?? '',
        });
      }

      if (user.is_active === false) {
        return res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
          message: i18n.t('auth.inactive_account'),
        });
      }

      const {
        access_token,
        refresh_token,
        personal_access_token_uuid: new_personal_access_token_uuid,
      } = await this.authService.login(user);

      await this.personalAccessTokensService.removeExistingTokensOfCurrentDevice(
        {
          tokenableId: user.id,
          tokenableType: USER_TOKENABLE_TYPE,
          deviceId: req.device_id,
        },
      );

      const isAlreadyLoggedIn =
        await this.personalAccessTokensService.isUserAlreadyLoggedIn(
          user.id,
          USER_TOKENABLE_TYPE,
        );

      await this.personalAccessTokensService.registerDevice({
        uuid: new_personal_access_token_uuid,
        tokenable_id: user.id,
        tokenable_type: USER_TOKENABLE_TYPE,
        device_id: req.device_id,
        device_name: req.device_name,
        device_type: this.personalAccessTokensService.deviceType(
          req.device_type,
        ),
        access_token: access_token,
        refresh_token: refresh_token,
        ip: ip,
        fcm_key: req.device_token || null,
      });

      await this.socialLoginService.updateSocialiteInfo(
        {
          user_id: user.id,
          social_id: req.social_id,
          type: this.socialLoginService.socialTypeIdentifier(req.social_type),
        },
        {
          data: req.social_data,
        },
      );

      return res.status(HttpStatus.OK).json({
        message: i18n.t('auth.signed_in'),
        data: {
          user: pick(user, [
            '_id',
            'name',
            'email',
            'isd_code',
            'mobile',
            'mobile_verified_at',
            'email_verified_at',
          ]),
          access_token,
          refresh_token,
          is_already_logged_in: isAlreadyLoggedIn,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: i18n.t('responses.internal_server_error'),
      });
    }
  }
}
