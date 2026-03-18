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
import { ResetPasswordDTO } from 'src/dto/reset_password.dto';
import { consumers, headers, response, tags } from 'src/swagger/Base';
import { ResetPasswordResponse } from 'src/swagger/ResetPasswordResponse';
import { ResetPasswordService } from './reset_password.service';

@Controller({
  version: '1',
})
export class ResetPasswordController {
  constructor(private resetPasswordService: ResetPasswordService) {}

  @ApiTags(tags.USER_AUTHENTICATION)
  @ApiOperation({
    operationId: 'resetPassword',
    summary: "Update the user's password using OTP sent over user email.",
  })
  @ApiConsumes(consumers.formURLEncoded)
  @ApiHeaders([headers.accept, headers.accept_language])
  @ApiOkResponse({
    type: ResetPasswordResponse,
  })
  @ApiUnauthorizedResponse(response.unauthorized)
  @ApiInternalServerErrorResponse(response.badRequest)
  @ApiUnprocessableEntityResponse(response.validationException)
  @ApiServiceUnavailableResponse(response.serverMaintenanceException)
  @Post('password/reset')
  async resetPassword(
    @Body() req: ResetPasswordDTO,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      await this.resetPasswordService.validateThePasswordResetRequest(req);

      return res.json({
        message: i18n.t('auth.password_updated'),
      });
    } catch (error) {
      if (error instanceof UnprocessableEntityException) {
        return res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
          message: i18n.t(error.getResponse()['message'][0]),
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message,
      });
    }
  }
}
