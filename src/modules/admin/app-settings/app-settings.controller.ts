import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Patch,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeaders,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { I18n, I18nContext } from 'nestjs-i18n';
import { headers, response, tags } from 'src/swagger/Base';
import { AppSettingsService } from './app-settings.service';
import { UpdateAppVersion } from './dto/UpdateAppVersion';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';

@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@ApiTags(tags.ADMIN_SETTINGS)
@ApiHeaders([headers.accept, headers.accept_language])
@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiUnprocessableEntityResponse(response.validationException)
@ApiUnauthorizedResponse(response.unauthorized)
@Controller({ version: '1', path: 'app-settings' })
export class AppSettingsController {
  constructor(private appSettingsService: AppSettingsService) {}
  // --------------------------------------------------------- Get App Versions ------------------------------------------------------------------
  @ApiOperation({
    operationId: 'version-management',
    summary: 'Get App Versions.',
  })
  @ApiOkResponse(response.app_versions)
  @Get('/app-version')
  async getAppVersions(@Res() res: Response, @I18n() i18n: I18nContext) {
    try {
      // Get All App Versions
      const versions = await this.appSettingsService.getAppVersions();
      return res.status(HttpStatus.OK).json({
        message: `Application versions ${i18n.t('responses.list')}`,
        data: versions,
      });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }

  // --------------------------------------------------------- Update App Versions ------------------------------------------------------------------
  @ApiOperation({
    operationId: 'update-version-management',
    summary: 'Update App Versions.',
  })
  // @ApiConsumes(consumers.formURLEncoded)
  @ApiOkResponse(response.ok)
  @Patch('/app-version/update')
  async updateAppVersion(
    @Body() versions: UpdateAppVersion,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      // Check key is existing or not.
      const isExist = await this.appSettingsService.getAppVersions();
      if (!isExist) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Application versions ${i18n.t('responses.not_found')}`,
        });
      }

      // Check Versions
      const { iosFlag, androidFlag } =
        await this.appSettingsService.checkVersion(
          versions.ios_version,
          versions.android_version,
          isExist.values,
        );
      if (!iosFlag) {
        return res.status(HttpStatus.FORBIDDEN).json({
          message: `${i18n.t('responses.ios_version_error')}`,
        });
      }
      if (!androidFlag) {
        return res.status(HttpStatus.FORBIDDEN).json({
          message: `${i18n.t('responses.android_version_error')}`,
        });
      }
      const newVersions = [
        {
          platform: 'ios',
          version: versions.ios_version,
          force_updatable: versions.ios_force_update,
        },
        {
          platform: 'android',
          version: versions.android_version,
          force_updatable: versions.android_force_update,
        },
      ];

      // Update App Versions
      const updateVersions = await this.appSettingsService.updateAppVersions(
        newVersions,
      );
      if (!updateVersions) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Application versions ${i18n.t('responses.not_found')}`,
        });
      }
      await this.appSettingsService.addAppVersionLogs(
        versions.android_version,
        versions.ios_version,
        versions.android_force_update,
        versions.ios_force_update,
      );
      return res.status(HttpStatus.OK).json({
        message: `Application versions ${i18n.t('responses.updated')}`,
      });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }
}
