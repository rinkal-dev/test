import { Controller, Get, HttpStatus, Res, UseGuards } from '@nestjs/common';
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
import { Response } from 'express';
import { pick } from 'lodash';
import { I18n, I18nContext } from 'nestjs-i18n';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { consumers, headers, response, tags } from 'src/swagger/Base';
import { UpdateLocaleResponse } from 'src/swagger/UpdateLocaleResponse';
import { AuthUser } from '../users/users.service';

@Controller({
  version: '1',
})
export class UserProfileController {
  @ApiTags(tags.USER_PROFILE)
  @ApiOperation({
    operationId: 'userProfile',
    summary: "Get the user's profile info.",
  })
  @ApiBearerAuth()
  @ApiConsumes(consumers.formURLEncoded)
  @ApiHeaders([headers.accept, headers.accept_language])
  @ApiOkResponse({
    type: UpdateLocaleResponse,
  })
  @ApiUnauthorizedResponse(response.unauthorized)
  @ApiInternalServerErrorResponse(response.badRequest)
  @ApiUnprocessableEntityResponse(response.validationException)
  @ApiServiceUnavailableResponse(response.serverMaintenanceException)
  @UseGuards(JwtAuthGuard)
  @Get('user/profile')
  async userProfile(
    @AuthUser() user,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      return res.status(HttpStatus.OK).json({
        message: i18n.t('label.ok'),
        data: {
          user: pick(user, [
            'id',
            'name',
            'email',
            'locale',
            'isd_code',
            'mobile',
            'mobile_verified_at',
            'email_verified_at',
          ]),
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
