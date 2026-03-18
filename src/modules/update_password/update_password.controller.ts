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
import * as bcrypt from 'bcrypt';
import { I18n, I18nContext } from 'nestjs-i18n';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UpdatePasswordDTO } from 'src/dto/update_password.dto';
import { consumers, headers, response, tags } from '../../swagger/Base';
import { AuthUser } from '../users/users.service';
import { UpdatePasswordResponse } from '../../swagger/UpdatePasswordResponse';

@Controller({
  version: '1',
})
export class UpdatePasswordController {
  @ApiTags(tags.USER_PROFILE)
  @ApiOperation({
    operationId: 'updatePassword',
    summary: 'Update the user password.',
  })
  @ApiBearerAuth()
  @ApiConsumes(consumers.formURLEncoded)
  @ApiHeaders([headers.accept, headers.accept_language])
  @ApiOkResponse({
    type: UpdatePasswordResponse,
  })
  @ApiUnauthorizedResponse(response.unauthorized)
  @ApiInternalServerErrorResponse(response.badRequest)
  @ApiUnprocessableEntityResponse(response.validationException)
  @ApiServiceUnavailableResponse(response.serverMaintenanceException)
  @UseGuards(JwtAuthGuard)
  @Patch('update-password')
  async updatePassword(
    @AuthUser() user,
    @Res() res: Response,
    @Body() req: UpdatePasswordDTO,
    @I18n() i18n: I18nContext,
  ) {
    try {
      if (!bcrypt.compareSync(req.password, user.password)) {
        return res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
          message: i18n.t('password.wrong_current_password'),
        });
      }

      if (bcrypt.compareSync(req.new_password, user.password)) {
        return res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
          message: i18n.t('auth.new_password_must_be_different'),
        });
      }

      user.password = await bcrypt.hash(req.new_password, 10);
      user.updated_at = new Date();
      user.save();

      return res.status(HttpStatus.OK).json({
        message: i18n.t('responses.password_updated'),
      });
    } catch (error) {
      console.log(error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: i18n.t('responses.internal_server_error'),
      });
    }
  }
}
