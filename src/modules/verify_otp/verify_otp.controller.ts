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
import { VerifyOTPDTO } from 'src/dto/verify_otp.dto';
import { consumers, headers, response, tags } from '../../swagger/Base';
import { VerifyOTPResponse } from '../../swagger/VerifyOTPResponse';
import { SendOtpService } from '../send_otp/send_otp.service';
import { AuthUser } from '../users/users.service';
import { VerifyOtpService } from './verify_otp.service';

@Controller({
  version: '1',
})
export class VerifyOtpController {
  constructor(
    private sendOTPService: SendOtpService,
    private verifyOTPService: VerifyOtpService,
  ) {}

  @ApiTags(tags.USER_PROFILE)
  @ApiOperation({
    operationId: 'verifyOTP',
    summary: 'It verify the OTP in order to perform important operation.',
  })
  @ApiBearerAuth()
  @ApiConsumes(consumers.formURLEncoded)
  @ApiHeaders([headers.accept])
  @ApiOkResponse({
    type: VerifyOTPResponse,
  })
  @ApiUnauthorizedResponse(response.unauthorized)
  @ApiInternalServerErrorResponse(response.badRequest)
  @ApiUnprocessableEntityResponse(response.validationException)
  @ApiServiceUnavailableResponse(response.serverMaintenanceException)
  @UseGuards(JwtAuthGuard)
  @Patch('verify-otp')
  async verifyOTP(
    @AuthUser() user,
    @Res() res: Response,
    @Body() req: VerifyOTPDTO,
    @I18n() i18n: I18nContext,
  ) {
    try {
      if (this.sendOTPService.isEmailVerification(req.verification_for)) {
        await this.sendOTPService.validateEmailRequest(req, user);
        if (!user.email_otp) {
          throw new UnprocessableEntityException(['auth.otp.request_first']);
        }
        this.verifyOTPService.throwIfOTPExpired(user.email_otp_expired_at);
        if (Number(req.otp) !== user.email_otp) {
          throw new UnprocessableEntityException(['auth.otp.not_matched']);
        }

        user.email_otp = user.email_otp_expired_at = null;
        user.email_verified_at = Date.now();
        user.email = req.email;
      } else {
        await this.sendOTPService.validateMobileRequest(req, user);
        if (!user.mobile_otp) {
          throw new UnprocessableEntityException(['auth.otp.request_first']);
        }
        this.verifyOTPService.throwIfOTPExpired(user.mobile_otp_expired_at);
        if (Number(req.otp) !== user.mobile_otp) {
          throw new UnprocessableEntityException(['auth.otp.not_matched']);
        }

        user.mobile_otp = user.mobile_otp_expired_at = null;
        user.mobile_verified_at = Date.now();
        user.isd_code = req.isd_code;
        user.mobile = req.mobile;
      }
      user.updated_at = new Date();
      user.save();

      return res.status(HttpStatus.OK).send({
        message: i18n.t('auth.otp.verified'),
      });
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
