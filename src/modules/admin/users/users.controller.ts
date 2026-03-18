import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { I18n, I18nContext } from 'nestjs-i18n';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiHeaders,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { consumers, headers, response, tags } from 'src/swagger/Base';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { ChangeStatusDto } from '../sub-admins/dto/ChangeStatusDto';
import { UsersQueries } from 'src/swagger/schema/UsersQueries';
import { UserListDto } from 'src/dto/userList.dto';

@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@ApiHeaders([headers.accept, headers.accept_language])
@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiUnprocessableEntityResponse(response.validationException)
@ApiUnauthorizedResponse(response.unauthorized)
@ApiTags(tags.USERS)
@Controller({ version: '1', path: 'users' })
export class UsersController {
  constructor(private userService: UsersService) {}
  // --------------------------------------------------------------- User list -------------------------------------------------------------------------------
  @ApiOperation({
    operationId: 'users',
    summary: 'Gives all users list.',
  })
  @ApiOkResponse(response.user_list)
  @Get('/')
  async getAllUsers(
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Query() queries: UserListDto,
  ) {
    try {
      const { count, rows: users } = await this.userService.getUsers(queries);
      return res.status(HttpStatus.OK).json({
        message: `User ${i18n.t('responses.list')}.`,
        data: { total_count: count, users: users },
      });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }

  // --------------------------------------------------------------- User Details ----------------------------------------------------------------------------
  @ApiOperation({
    operationId: 'user-details',
    summary: 'User details.',
  })
  @ApiOkResponse(response.user_details)
  @ApiParam({ name: 'uuid', type: String })
  @Get('/:uuid/show')
  async getUserDetails(
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Param('uuid') uuid: string,
  ) {
    try {
      const userDetails = await this.userService.getUserDetails(uuid);
      if (!userDetails) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `User ${i18n.t('responses.not_found')}.`,
        });
      }

      const result = await this.userService.formatResponse(userDetails);

      return res.status(HttpStatus.OK).json({
        message: `User ${i18n.t('responses.details')}.`,
        data: result,
      });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }

  // --------------------------------------------------------------- Change Status ----------------------------------------------------------------------------
  @ApiOperation({
    operationId: 'user-status',
    summary: 'Change status of particular  user.',
  })
  @ApiConsumes(consumers.formURLEncoded)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', type: String })
  @Patch('/:uuid/activate')
  async changeStatus(
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Body() body: ChangeStatusDto,
    @Param('uuid') uuid: string,
  ) {
    try {
      const changeStatus = await this.userService.changeStatus(
        uuid,
        body.status,
      );
      if (!changeStatus) {
        return res.status(HttpStatus.OK).json({
          message: `User's ${i18n.t('responses.status_not_change')}`,
        });
      }
      return res.status(HttpStatus.OK).json({
        message: `User's ${i18n.t('responses.status_change')}`,
      });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }
}
