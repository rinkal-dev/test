import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Res,
  UnprocessableEntityException,
} from '@nestjs/common';
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
import { Response } from 'express';
import { I18n, I18nContext } from 'nestjs-i18n';
import { ForgotPasswordDTO } from 'src/dto/forgot_password.dto';
import { UsersService } from 'src/modules/users/users.service';
import { consumers, headers, response, tags } from 'src/swagger/Base';
import { ForgotPasswordResponse } from 'src/swagger/ForgotPasswordResponse';
import { ForgotPasswordService } from './forgot_password.service';

@Controller({
  version: '1',
})
export class ForgotPasswordController {
  constructor(
    private forgotPasswordService: ForgotPasswordService,
    private userService: UsersService,
  ) {}

  @ApiTags(tags.USER_AUTHENTICATION)
  @ApiOperation({
    operationId: 'forgotPassword',
    summary: 'Send the reset password link or OTP email to user.',
  })
  @ApiConsumes(consumers.formURLEncoded)
  @ApiHeaders([headers.accept, headers.accept_language])
  @ApiOkResponse({
    type: ForgotPasswordResponse,
  })
  @ApiUnauthorizedResponse(response.unauthorized)
  @ApiInternalServerErrorResponse(response.badRequest)
  @ApiUnprocessableEntityResponse(response.validationException)
  @ApiServiceUnavailableResponse(response.serverMaintenanceException)
  @Post('password/email')
  async forgotPassword(
    @Body() req: ForgotPasswordDTO,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      if ((await this.userService.isUserEmailExists(req.email)) === 0) {
        return res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
          message: i18n.t('auth.invalid_forgot_password_req'),
        });
      }

      await this.forgotPasswordService.registerNewToken(req.email);

      return res.status(HttpStatus.OK).json({
        message: i18n.t('auth.password_reset_request_sent'),
      });
    } catch (error) {
      console.log(error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: i18n.t('responses.internal_server_error'),
      });
    }
  }
}
