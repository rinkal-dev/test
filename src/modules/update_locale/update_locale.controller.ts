import {
  Body,
  Controller,
  HttpStatus,
  Patch,
  Res,
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
import { UpdateLocaleDTO } from 'src/dto/update_locale.dto';
import { consumers, headers, response, tags } from '../../swagger/Base';
import { UpdateLocaleResponse } from '../../swagger/UpdateLocaleResponse';
import { AuthUser } from '../users/users.service';

@Controller({
  version: '1',
})
export class UpdateLocaleController {
  @ApiTags(tags.USER_PROFILE)
  @ApiOperation({
    operationId: 'updateLocale',
    summary: 'Update the user locale.',
  })
  @ApiBearerAuth()
  @ApiConsumes(consumers.formURLEncoded)
  @ApiHeaders([headers.accept])
  @ApiOkResponse({
    type: UpdateLocaleResponse,
  })
  @ApiUnauthorizedResponse(response.unauthorized)
  @ApiInternalServerErrorResponse(response.badRequest)
  @ApiUnprocessableEntityResponse(response.validationException)
  @ApiServiceUnavailableResponse(response.serverMaintenanceException)
  @UseGuards(JwtAuthGuard)
  @Patch('update-locale')
  async updateLocale(
    @AuthUser() user,
    @Res() res: Response,
    @Body() req: UpdateLocaleDTO,
    @I18n() i18n: I18nContext,
  ) {
    try {
      user.locale = req.locale;
      user.updated_at = new Date();
      user.save();

      return res.status(HttpStatus.OK).json({
        message: i18n.t('responses.locale_updated'),
      });
    } catch (error) {
      console.log(error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: i18n.t('responses.internal_server_error'),
      });
    }
  }
}
