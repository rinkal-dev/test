import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  Ip,
  UnprocessableEntityException,
  UseGuards,
  Delete,
  Headers,
  Param,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
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
import { Response, Request } from 'express';
import { pick } from 'lodash';
import { I18n, I18nContext } from 'nestjs-i18n';
import { LoginDTO } from './dto/LoginDto';
import { consumers, headers, response, tags } from 'src/swagger/Base';
import { AdminAuthService } from './admin-auth.service';
import { PersonalAccessTokensService } from 'src/modules/auth/personal_access_tokens/personal_access_tokens.service';
import { ForgotPasswordDTO } from 'src/dto/forgot_password.dto';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { ADMIN_TOKENABLE_TYPE } from 'src/config/constants';
import { AdminResetPasswordDto } from './dto/AdminResetPasswordDto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@ApiTags(tags.ADMIN_AUTH)
@ApiHeaders([headers.accept, headers.accept_language])
@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiUnprocessableEntityResponse(response.validationException)
@Controller({ version: '1', path: 'admins' })
export class AdminAuthController {
  constructor(
    private adminAuthService: AdminAuthService,
    private personalAccessTokensService: PersonalAccessTokensService,
    private activityLogsService: ActivityLogsService,
  ) {}
  // ------------------------------------------------------------- Login -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'login',
    summary: 'Make the admin login.',
  })
  @ApiConsumes(consumers.formURLEncoded)
  @ApiOkResponse(response.admin_login)
  @ApiConflictResponse(response.conflict)
  @ApiOkResponse(response.success)
  @Post('/login')
  async login(
    @Body() admin: LoginDTO,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
  ) {
    try {
      // Validate admin credentials
      const { admin: adminData, error } = await this.adminAuthService.validate(
        admin.email,
        admin.password,
      );

      // Handle specific validation errors
      if (error) {
        return res
          .status(HttpStatus.UNAUTHORIZED)
          .json({ message: i18n.t(`auth.${error}`) });
      }

      // Check if account is active
      if (adminData.is_active === false) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json({ message: i18n.t('auth.inactive_account') });
      }

      const {
        access_token,
        refresh_token,
        personal_access_token_uuid: new_personal_access_token_uuid,
      } = await this.adminAuthService.login(adminData);

      await this.personalAccessTokensService.removeExistingAdminTokensOfCurrentDevice(
        {
          adminId: adminData.id,
          deviceId: admin.device_id,
        },
      );

      const isAlreadyLoggedIn =
        await this.adminAuthService.isAdminAlreadyLoggedIn(adminData.id);

      await this.personalAccessTokensService.registerDevice({
        uuid: new_personal_access_token_uuid,
        tokenable_type: ADMIN_TOKENABLE_TYPE,
        tokenable_id: adminData.id,
        device_id: admin.device_id,
        device_name: admin.device_name,
        device_type: this.personalAccessTokensService.deviceType(
          admin.device_type,
        ),
        access_token: access_token,
        refresh_token: refresh_token,
        ip: ip,
        fcm_key: admin.device_token || null,
      });

      // Get admin's permissions
      const permissions = await this.adminAuthService.getAdminPermissions(adminData.id);

      // Log the login activity
      await this.activityLogsService.logActivity({
        adminId: adminData.id,
        action: 'LOGIN',
        entityType: 'admin',
        entityId: adminData.uuid,
        entityName: adminData.name,
        description: `Admin "${adminData.name}" (${adminData.email}) logged in`,
        ipAddress: ip,
        metadata: {
          device_name: admin.device_name,
          device_type: admin.device_type,
        },
      });

      return res.status(HttpStatus.OK).json({
        message: i18n.t('auth.signed_in'),
        data: {
          admin: pick(adminData, [
            'uuid',
            'name',
            'email',
            'mobile',
            'mobile_verified_at',
            'email_verified_at',
          ]),
          permissions,
          is_already_logged_in: isAlreadyLoggedIn,
          access_token,
          refresh_token,
        },
      });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }

  // ------------------------------------------------------------- Forgot Password -----------------------------------------------------------------------
  @ApiConsumes(consumers.formURLEncoded)
  @ApiOperation({
    operationId: 'forgotPassword',
    summary: 'Send the reset password link or OTP email to admin.',
  })
  @ApiOkResponse(response.ok)
  @ApiInternalServerErrorResponse(response.badRequest)
  @ApiServiceUnavailableResponse(response.serverMaintenanceException)
  @Post('password/email')
  async forgotPassword(
    @Body() req: ForgotPasswordDTO,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const adminCheck = await this.adminAuthService.checkAdminForPasswordReset(req.email);

      if (!adminCheck.exists) {
        throw new UnprocessableEntityException({
          message: i18n.t('auth.invalid_forgot_password_req'),
        });
      }

      if (!adminCheck.isActive) {
        throw new UnprocessableEntityException({
          message: i18n.t('auth.inactive_account'),
        });
      }

      await this.adminAuthService.registerNewToken(req.email);

      return res.json({
        message: i18n.t('auth.password_reset_request_sent'),
      });
    } catch (error) {
      console.log(error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Validate Token -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'validate-token',
    summary: 'Validate token for Forgot Password.',
  })
  @ApiOkResponse(response.ok)
  @ApiInternalServerErrorResponse(response.badRequest)
  @ApiServiceUnavailableResponse(response.serverMaintenanceException)
  @Post(':token/validate')
  async validateToken(
    @Res() res: Response,
    @Param('token') token: string,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const validateToken = await this.adminAuthService.validateToken(token);

      if (!validateToken) {
        return res.status(HttpStatus.FORBIDDEN).json({
          message: i18n.t('auth.invalid_link'),
        });
      }

      return res.status(HttpStatus.OK).json({
        message: i18n.t('auth.valid_token'),
      });
    } catch (error) {
      console.log(error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Reset Password -----------------------------------------------------------------------
  @ApiConsumes(consumers.formURLEncoded)
  @ApiOperation({
    operationId: 'resetPassword',
    summary: "Update the admin's password using OTP sent over admin email.",
  })
  @ApiOkResponse(response.ok)
  @ApiServiceUnavailableResponse(response.serverMaintenanceException)
  @Post('password/reset')
  async resetPassword(
    @Body() req: AdminResetPasswordDto,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      await this.adminAuthService.validateThePasswordResetRequest(req);

      return res.json({
        message: i18n.t('password.password_updated'),
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

  // ------------------------------------------------------------- Logout -----------------------------------------------------------------------

  @ApiOperation({
    operationId: 'logout',
    summary: 'Make the admin logout.',
  })
  @ApiOkResponse(response.ok)
  @ApiUnauthorizedResponse(response.unauthorized)
  @ApiServiceUnavailableResponse(response.serverMaintenanceException)
  @ApiBearerAuth()
  @UseGuards(JwtAdminAuthGuard)
  @Delete('logout')
  async logout(
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Headers() headers,
    @Ip() ip: string,
  ) {
    try {
      const { personal_access_token_uuid, sub } =
        this.adminAuthService.getCurrentPersonalTokenID(headers.authorization);

      // Log the logout activity before destroying session
      await this.activityLogsService.logActivity({
        adminId: sub,
        action: 'LOGOUT',
        entityType: 'admin',
        entityId: String(sub),
        entityName: 'Admin',
        description: `Admin logged out`,
        ipAddress: ip,
      });

      await this.adminAuthService.logout({
        tokenableId: sub,
        personalAccessTokenUUID: personal_access_token_uuid,
        tokenableType: ADMIN_TOKENABLE_TYPE,
      });

      return res.status(HttpStatus.OK).json({
        message: i18n.t('auth.signed_out'),
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message,
      });
    }
  }
}
