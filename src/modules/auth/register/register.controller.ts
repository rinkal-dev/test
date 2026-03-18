import { Body, Controller, HttpStatus, Ip, Post, Res } from '@nestjs/common';
import { I18n, I18nContext } from 'nestjs-i18n';
import { AuthService } from 'src/auth/auth.service';
import { RegisterDTO } from 'src/dto/register.dto';
import { pick } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/modules/users/users.service';
import { PersonalAccessTokensService } from '../personal_access_tokens/personal_access_tokens.service';
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
import { RegisterResponse } from 'src/swagger/RegisterResponse';
import { USER_TOKENABLE_TYPE } from 'src/config/constants';

@Controller({
  version: '1',
})
export class RegisterController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
    private personalAccessTokensService: PersonalAccessTokensService,
  ) {}

  @ApiTags(tags.USER_AUTHENTICATION)
  @ApiOperation({
    operationId: 'register',
    summary: 'Make the user register.',
  })
  @ApiConsumes(consumers.formURLEncoded)
  @ApiHeaders([headers.accept, headers.accept_language])
  @ApiOkResponse({
    type: RegisterResponse,
  })
  @ApiUnauthorizedResponse(response.unauthorized)
  @ApiInternalServerErrorResponse(response.badRequest)
  @ApiUnprocessableEntityResponse(response.validationException)
  @ApiServiceUnavailableResponse(response.serverMaintenanceException)
  @Post('register')
  async register(
    @Body() req: RegisterDTO,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
  ) {
    try {
      let isExists = await this.usersService.isUserEmailExists(req.email);
      if (isExists) {
        return res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
          message: i18n.t('auth.email_already_exists'),
        });
      }

      isExists = await this.usersService.isUserUsernameExists(req.username);
      if (isExists) {
        return res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
          message: i18n.t('auth.username_already_exists'),
        });
      }

      isExists = await this.usersService.isUserMobileExists(
        req.isd_code,
        req.mobile,
      );
      if (isExists) {
        return res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
          message: i18n.t('auth.mobile_already_exists'),
        });
      }

      const user = await this.usersService.create({
        uuid: uuidv4(),
        name: req.name,
        username: req.username,
        email: req.email,
        password: await bcrypt.hash(req.password, 10),
        isd_code: req.isd_code,
        mobile: req.mobile,
      });

      const { access_token, refresh_token, personal_access_token_uuid } =
        await this.authService.login(user);

      await this.personalAccessTokensService.registerDevice({
        uuid: personal_access_token_uuid,
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

      return res.status(HttpStatus.OK).json({
        message: i18n.t('auth.signed_up'),
        data: {
          user: pick(user, [
            'id',
            'uuid',
            'name',
            'email',
            'isd_code',
            'mobile',
            'mobile_verified_at',
            'email_verified_at',
          ]),
          access_token,
          refresh_token,
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
