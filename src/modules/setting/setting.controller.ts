import { Controller, Get, HttpStatus, Query, Res } from '@nestjs/common';
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
import { AppVersionDTO } from '../../dto/app_version.dto';
import { AppVersionResponse } from '../../swagger/AppVersionResponse';
import { consumers, headers, response, tags } from '../../swagger/Base';
import { SettingService } from './setting.service';

@Controller({
  path: 'settings',
  version: '1',
})
export class SettingController {
  constructor(private settingService: SettingService) {}

  @ApiTags(tags.SETTINGS)
  @ApiOperation({
    operationId: 'appVersion',
    summary: 'Get the application version of each platform i.e. android, ios.',
  })
  @ApiConsumes(consumers.formURLEncoded)
  @ApiHeaders([headers.accept, headers.accept_language])
  @ApiOkResponse({
    type: AppVersionResponse,
  })
  @ApiUnauthorizedResponse(response.unauthorized)
  @ApiInternalServerErrorResponse(response.badRequest)
  @ApiUnprocessableEntityResponse(response.validationException)
  @ApiServiceUnavailableResponse(response.serverMaintenanceException)
  @Get('app-version')
  async appVersion(
    @Query() req: AppVersionDTO,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const data = await this.settingService.getAppVersion(req.platform);

      return res.status(HttpStatus.OK).json({
        message: i18n.t('label.ok'),
        data: data ?? null,
      });
    } catch (error) {
      console.log(error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: i18n.t('responses.internal_server_error'),
      });
    }
  }
}
