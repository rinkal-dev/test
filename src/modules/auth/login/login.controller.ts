import {
  Body,
  Controller,
  Delete,
  Headers,
  HttpStatus,
  Ip,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { I18n, I18nContext } from 'nestjs-i18n';
import { AuthService } from 'src/auth/auth.service';
import { LocalAuthGuard } from 'src/auth/local-auth.guard';
import { UserLoginDTO } from 'src/dto/login.dto';
import { pick } from 'lodash';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RefreshDTO } from 'src/dto/refresh.dto';
import { AuthUser } from 'src/modules/users/users.service';
import { PersonalAccessTokensService } from '../personal_access_tokens/personal_access_tokens.service';
import {
  ApiBearerAuth,
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
import { LoginResponse } from 'src/swagger/Login';
import { RefreshTokenResponse } from 'src/swagger/RefreshTokenResponse';
import { LogoutResponse } from 'src/swagger/Logout';
import { PastLogoutResponse } from 'src/swagger/PastLogoutResponse';
import { JwtRefreshAuthGuard } from '../../../auth/jwt-refresh.guard';
import { USER_TOKENABLE_TYPE } from 'src/config/constants';

@Controller({
  version: '1',
})
export class LoginController {
  constructor(
    private authService: AuthService,
    private personalAccessTokensService: PersonalAccessTokensService,
  ) {}

  @ApiTags(tags.USER_AUTHENTICATION)
  @ApiOperation({
    operationId: 'login',
    summary: 'Make the user login',
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
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @AuthUser() user: any,
    @Body() req: UserLoginDTO,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
  ) {
    try {
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
          user.dataValues.id,
          USER_TOKENABLE_TYPE,
        );

      await this.personalAccessTokensService.registerDevice({
        uuid: new_personal_access_token_uuid,
        tokenable_type: USER_TOKENABLE_TYPE,
        tokenable_id: user.id,
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
        message: i18n.t('auth.signed_in'),
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

  @ApiTags(tags.USER_AUTHENTICATION)
  @ApiOperation({
    operationId: 'tokenRefresh',
    summary: "Refresh the user's access token",
  })
  @ApiConsumes(consumers.formURLEncoded)
  @ApiHeaders([headers.accept, headers.accept_language, headers.refresh_token])
  @ApiOkResponse({
    type: RefreshTokenResponse,
  })
  @ApiUnauthorizedResponse(response.unauthorized)
  @ApiInternalServerErrorResponse(response.badRequest)
  @ApiUnprocessableEntityResponse(response.validationException)
  @ApiServiceUnavailableResponse(response.serverMaintenanceException)
  @UseGuards(JwtRefreshAuthGuard)
  @Put('token/refresh')
  async refresh(
    @AuthUser() user,
    @Body() req: RefreshDTO,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
    @Headers('Refresh-Token') token,
  ) {
    try {
      const { personal_access_token_uuid: currentToken } =
        this.authService.decodeJwtToken(token);
      await this.personalAccessTokensService.removeExistingTokenOfByUUId(
        currentToken,
      );

      const {
        access_token,
        refresh_token,
        personal_access_token_uuid: new_personal_access_token_uuid,
      } = await this.authService.login(user);

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

      return res.status(HttpStatus.OK).json({
        message: i18n.t('auth.token_refreshed'),
        data: {
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

  @ApiTags(tags.USER_PROFILE)
  @ApiOperation({
    operationId: 'logout',
    summary: 'Make the user logout.',
  })
  @ApiBearerAuth()
  @ApiHeaders([headers.accept, headers.accept_language])
  @ApiOkResponse({
    type: LogoutResponse,
  })
  @ApiUnauthorizedResponse(response.unauthorized)
  @ApiInternalServerErrorResponse(response.badRequest)
  @ApiUnprocessableEntityResponse(response.validationException)
  @ApiServiceUnavailableResponse(response.serverMaintenanceException)
  @UseGuards(JwtAuthGuard)
  @Delete('logout')
  async logout(
    @AuthUser() user,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Headers() headers,
  ) {
    try {
      const { personal_access_token_uuid } =
        this.authService.getCurrentPersonalTokenID(headers.authorization);

      await this.personalAccessTokensService.logout({
        tokenableId: user.id,
        tokenableType: USER_TOKENABLE_TYPE,
        uuid: personal_access_token_uuid,
      });

      return res.status(HttpStatus.OK).json({
        message: i18n.t('auth.signed_out'),
      });
    } catch (error) {
      console.log(error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: i18n.t('responses.internal_server_error'),
      });
    }
  }

  @ApiTags(tags.USER_PROFILE)
  @ApiOperation({
    operationId: 'pastLogout',
    summary: 'Make the user logout from other devices except current one.',
  })
  @ApiConsumes(consumers.formURLEncoded)
  @ApiBearerAuth()
  @ApiHeaders([headers.accept, headers.accept_language])
  @ApiOkResponse({
    type: PastLogoutResponse,
  })
  @ApiUnauthorizedResponse(response.unauthorized)
  @ApiInternalServerErrorResponse(response.badRequest)
  @ApiUnprocessableEntityResponse(response.validationException)
  @ApiServiceUnavailableResponse(response.serverMaintenanceException)
  @UseGuards(JwtAuthGuard)
  @Delete('past/logout')
  async pastLogout(
    @AuthUser() user,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Headers('Authorization') token: string,
  ) {
    try {
      const { personal_access_token_uuid } =
        this.authService.getCurrentPersonalTokenID(token);

      await this.personalAccessTokensService.logoutFromOtherDevices({
        userId: user.id,
        personalAccessTokenUUID: personal_access_token_uuid,
      });

      return res.status(HttpStatus.OK).send({
        message: i18n.t('auth.past_signed_out'),
      });
    } catch (error) {
      console.log(error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: i18n.t('responses.internal_server_error'),
      });
    }
  }
}
