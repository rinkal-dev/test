import {
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Patch,
  Res,
  UseGuards,
} from '@nestjs/common';
import { I18n, I18nContext } from 'nestjs-i18n';
import { Response } from 'express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiHeaders,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { UpdatePasswordDto } from './dto/UpdatePasswordDto';
import { UpdateProfileDto } from './dto/UpdateProfileDto';
import { consumers, headers, response, tags } from 'src/swagger/Base';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { AdminAuthService } from '../admin-auth/admin-auth.service';

@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@ApiNotFoundResponse(response.not_found)
@ApiUnauthorizedResponse(response.unauthorized)
@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiUnprocessableEntityResponse(response.validationException)
@ApiHeaders([headers.accept, headers.accept_language])
@ApiTags(tags.ADMIN_PROFILE)
@Controller({ version: '1', path: 'profile' })
export class ProfilesController {
  constructor(
    private profilesService: ProfilesService,
    private adminAuthService: AdminAuthService,
  ) {}

  @ApiOperation({
    operationId: 'update-admin-password',
    summary: `Update Admin's Password.`,
  })
  @ApiConsumes(consumers.formURLEncoded)
  @ApiOkResponse(response.ok)
  @ApiForbiddenResponse(response.forbidden)
  @Patch('/password/update')
  async updatePassword(
    @Body() admin: UpdatePasswordDto,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      // Get Admin
      const isExist = await this.profilesService.getAdminDetails(admin.email);
      if (!isExist) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: `Admin ${i18n.t('responses.not_found')}` });
      }

      // Check Current Password correct or not.
      const checkCurrentPassword = await this.profilesService.checkPassword(
        isExist.password,
        admin.current_password,
      );
      if (!checkCurrentPassword) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json({ message: i18n.t('password.wrong_current_password') });
      }

      // Check New Password and Current password same or not.
      const checkNewPassword = await this.profilesService.checkPassword(
        isExist.password,
        admin.new_password,
      );
      if (checkNewPassword) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json({ message: i18n.t('password.same_new_current_password') });
      }

      // Update Password.
      const updatePassword = await this.profilesService.updatePassword(
        isExist.id,
        admin.new_password,
      );
      if (!updatePassword[0]) {
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ message: i18n.t('responses.internal_server_error') });
      }
      return res
        .status(HttpStatus.OK)
        .json({ message: i18n.t('password.password_updated') });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }

  // --------------------------------------------------------------- Admin Profile ----------------------------------------------------------------------------
  @ApiOperation({
    operationId: 'admin-profile',
    summary: 'Admin Profile.',
  })
  @ApiOkResponse(response.admin_profile)
  @ApiBearerAuth()
  @UseGuards(JwtAdminAuthGuard)
  @Get('/')
  async getUserDetails(
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Headers() headers,
  ) {
    try {
      const { sub } = this.adminAuthService.getCurrentPersonalTokenID(
        headers.authorization,
      );
      const adminProfile = await this.profilesService.getProfile(sub);
      if (!adminProfile) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Admin ${i18n.t('responses.not_found')}.`,
        });
      }

      return res.status(HttpStatus.OK).json({
        message: `Admin ${i18n.t('responses.details')}.`,
        data: adminProfile,
      });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }

  // --------------------------------------------------------------- Update Profile ----------------------------------------------------------------------------
  @ApiOperation({
    operationId: 'update-admin-profile',
    summary: 'Update Admin Profile.',
  })
  @ApiConsumes(consumers.formURLEncoded)
  @ApiOkResponse(response.ok)
  @ApiBearerAuth()
  @UseGuards(JwtAdminAuthGuard)
  @Patch('/update')
  async updateProfile(
    @Body() data: UpdateProfileDto,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Headers() headers,
  ) {
    try {
      const { sub } = this.adminAuthService.getCurrentPersonalTokenID(
        headers.authorization,
      );

      const updateResult = await this.profilesService.updateProfile(sub, {
        name: data.name,
        mobile: data.mobile,
        profile_image: data.profile_image,
      });

      if (!updateResult[0]) {
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ message: i18n.t('responses.internal_server_error') });
      }

      // Get updated profile
      const adminProfile = await this.profilesService.getProfile(sub);

      return res.status(HttpStatus.OK).json({
        message: `Profile ${i18n.t('responses.updated')}.`,
        data: adminProfile,
      });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }
}
