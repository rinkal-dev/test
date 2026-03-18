import {
  Body,
  Controller,
  HttpStatus,
  Patch,
  Res,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
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
import { I18n, I18nContext } from 'nestjs-i18n';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { consumers, headers, response, tags } from '../../swagger/Base';
import { AuthUser } from '../users/users.service';
import { SendOtpService } from './send_otp.service';
import { SendOTPResponse } from '../../swagger/SendOTPResponse';
import { SendOTPDTO } from '../../dto/send_otp.dto';

@Controller({
  version: '1',
})
export class SendOtpController {
  constructor(private sendOTPService: SendOtpService) {}

  @ApiTags(tags.USER_PROFILE)
  @ApiOperation({
    operationId: 'sendOTP',
    summary: 'It sends the OTP on mobile number.',
  })
  @ApiBearerAuth()
  @ApiConsumes(consumers.formURLEncoded)
  @ApiHeaders([headers.accept])
  @ApiOkResponse({
    type: SendOTPResponse,
  })
  @ApiUnauthorizedResponse(response.unauthorized)
  @ApiInternalServerErrorResponse(response.badRequest)
  @ApiUnprocessableEntityResponse(response.validationException)
  @ApiServiceUnavailableResponse(response.serverMaintenanceException)
  @UseGuards(JwtAuthGuard)
  @Patch('send-otp')
  async sendOTP(
    @AuthUser() user,
    @Res() res: Response,
    @Body() req: SendOTPDTO,
    @I18n() i18n: I18nContext,
  ) {
    try {
      let message = '';

      if (this.sendOTPService.isEmailVerification(req.verification_for)) {
        await this.sendOTPService.validateEmailRequest(req, user);

        user.email_otp = await this.sendOTPService.sendOTPToClientViaEmail(
          req,
          user,
        );
        user.email_otp_expired_at = this.sendOTPService.otpWillExpireAt();

        message = i18n.t('auth.otp.sent', {
          args: {
            over: req.email,
          },
        });
      } else {
        await this.sendOTPService.validateMobileRequest(req, user);

        user.mobile_otp = await this.sendOTPService.sendOTPToClientViaMobile(
          req,
          user,
        );
        user.mobile_otp_expired_at = this.sendOTPService.otpWillExpireAt();

        message = i18n.t('auth.otp.sent', {
          args: {
            over: `${req.isd_code}${req.mobile}`,
          },
        });
      }
      user.updated_at = new Date();
      user.save();

      return res.status(HttpStatus.OK).send({ message: message });
    } catch (error) {
      if (error instanceof UnprocessableEntityException) {
        return res.status(HttpStatus.UNPROCESSABLE_ENTITY).send({
          message: i18n.t(error.getResponse()['message'][0]),
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        message: error.message,
      });
    }
  }
}
