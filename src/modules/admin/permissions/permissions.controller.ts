import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Res,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiConsumes,
  ApiHeaders,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { I18n, I18nContext } from 'nestjs-i18n';
import { consumers, headers, response, tags } from 'src/swagger/Base';
import { PermissionService } from './permissions.service';
import { CreatePermissionDto } from './dto/CreatePermissionDto';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { PermissionQueries } from 'src/swagger/schema/PermissionQueries';

@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiUnprocessableEntityResponse(response.validationException)
@ApiHeaders([headers.accept, headers.accept_language])
@ApiTags(tags.PERMISSIONS)
@Controller({ version: '1', path: 'permissions' })
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  // ------------------------------------------------------------- Create Permission -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'create-permission',
    summary: 'Create Permission.',
  })
  @ApiConflictResponse(response.conflict)
  @ApiOkResponse(response.ok)
  @ApiConsumes(consumers.formURLEncoded)
  @Post('/store')
  async createPermission(
    @Body() permission: CreatePermissionDto,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      // Check Guard Name is exist or not.
      const isExist = await this.permissionService.checkPermissionName(
        permission.name,
      );
      if (isExist !== 0) {
        return res
          .status(HttpStatus.CONFLICT)
          .json({ message: `Name ${i18n.t('responses.already_exist')}` });
      }

      // Create Permission
      const addPermission = await this.permissionService.createPermission(
        permission,
      );
      if (!addPermission) {
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ message: i18n.t('responses.internal_server_error') });
      }
      return res
        .status(HttpStatus.OK)
        .json({ message: `Permission ${i18n.t('responses.created')}` });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }

  // ------------------------------------------------------------- Get All Permissions -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'all-permission',
    summary: 'Get all Permission.',
  })
  @ApiOkResponse(response.permission_list)
  @Get('/')
  async getAllPermissions(
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Query() queries: PermissionQueries,
  ) {
    try {
      // Get All Permissions
      const { count, rows: permissions } =
        await this.permissionService.getAllPermissions(queries);
      return res.status(HttpStatus.OK).json({
        message: `Permission ${i18n.t('responses.list')}`,
        data: { total_count: count, permissions: permissions },
      });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }

  // ------------------------------------------------------------- Get Permission Details -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'permission-details',
    summary: 'Get Permission details.',
  })
  @ApiOkResponse(response.permission_details)
  @ApiParam({ name: 'uuid', type: String })
  @Get('/:uuid/show')
  async getPermissionDetails(
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      // Get Permission Details.
      const permissionDetails =
        await this.permissionService.getPermissionDetails(uuid);
      if (!permissionDetails) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'Permission ' + i18n.t('responses.not_found') });
      }
      return res.status(HttpStatus.OK).json({
        message: `Permission ${i18n.t('responses.details')}`,
        data: permissionDetails,
      });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }

  // ------------------------------------------------------------- Update Permission -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'update-permission',
    summary: 'Update Permission.',
  })
  @ApiInternalServerErrorResponse(response.badRequest)
  @ApiConflictResponse(response.badRequest)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', type: String })
  @ApiConsumes(consumers.formURLEncoded)
  @Patch('/:uuid/update')
  async updatePermission(
    @Param('uuid') uuid: string,
    @Body() permission: CreatePermissionDto,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      // Check Guard Name is exist or not.
      const isExist = await this.permissionService.checkPermissionByUUID(uuid);
      if (!isExist) {
        return res
          .status(HttpStatus.CONFLICT)
          .json({ message: `Permission ${i18n.t('responses.not_found')}` });
      }

      if (isExist.name !== permission.name) {
        const isExist = await this.permissionService.checkPermissionName(
          permission.name,
        );
        if (isExist !== 0) {
          return res
            .status(HttpStatus.CONFLICT)
            .json({ message: `Name ${i18n.t('responses.already_exist')}` });
        }
      }

      const updatedPermission = await this.permissionService.update(
        uuid,
        permission,
      );
      if (updatedPermission[0] === 0) {
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ message: i18n.t('responses.error_occurred') });
      }
      return res
        .status(HttpStatus.OK)
        .json({ message: `Permission ${i18n.t('responses.updated')}` });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }

  // ------------------------------------------------------------- Delete Permission -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'delete-permission',
    summary: 'Delete Permission.',
  })
  @ApiNotFoundResponse(response.badRequest)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', type: String })
  @Delete('/:uuid/destroy')
  async deletePermission(
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const deletePermission = await this.permissionService.deletePermission(
        uuid,
      );
      if (!deletePermission) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: `Permission ${i18n.t('responses.not_found')}` });
      }
      return res
        .status(HttpStatus.OK)
        .json({ message: `Permission ${i18n.t('responses.deleted')}` });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }
}
