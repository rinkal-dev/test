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
  Req,
  HttpStatus,
  Query,
  Ip,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiHeaders,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import { I18n, I18nContext } from 'nestjs-i18n';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/CreateRoleDto';
import { headers, response, tags } from 'src/swagger/Base';
import { PermissionService } from '../permissions/permissions.service';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/decorators/require-permission.decorator';
import { PermissionQueries } from 'src/swagger/schema/PermissionQueries';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { getDataFilterAdminId, hasFullDataAccess } from 'src/helpers/data-ownership.helper';

@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard, PermissionGuard)
@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiUnprocessableEntityResponse(response.validationException)
@ApiHeaders([headers.accept, headers.accept_language])
@ApiTags(tags.ROLES)
@Controller({ version: '1', path: 'roles' })
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly permissionService: PermissionService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  // ------------------------------------------------------------- Create Role -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'role',
    summary: 'Create role.',
  })
  @ApiConflictResponse(response.conflict)
  @ApiBadRequestResponse(response.badRequest)
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @RequirePermission('roles.create')
  @Post('/store')
  async createRole(
    @Body() role: CreateRoleDto,
    @Res() res: Response,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
  ) {
    try {
      if (role.permissions.length === 0) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: `Permission ${i18n.t('responses.not_selected')}` });
      }

      // Check Role is Exist or not
      const checkRole = await this.rolesService.checkRole(role.name);
      if (checkRole !== 0) {
        return res
          .status(HttpStatus.CONFLICT)
          .json({ message: `Role ${i18n.t('responses.already_exist')}` });
      }

      const checkPermissions = await this.permissionService.checkPermission(
        role.permissions,
      );
      if (!checkPermissions) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: `Permission ${i18n.t('responses.not_found')}` });
      }

      const admin = (req as any).user;
      // Super Admin creates global roles (created_by = null)
      // Sub-admin creates private roles (created_by = their ID)
      const createdBy = getDataFilterAdminId(admin);
      const addRole = await this.rolesService.createRole(role.name, createdBy);
      if (!addRole) {
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ message: i18n.t('responses.error_occurred') });
      }

      const addPermissions = await this.rolesService.addPermissions(
        addRole.id,
        role.permissions,
      );
      if (!addPermissions) {
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ message: 'Error occurred while adding permissions.' });
      }

      // Log activity
      await this.activityLogsService.logActivity({
        adminId: admin?.id,
        action: 'CREATE',
        entityType: 'role',
        entityId: addRole.uuid,
        entityName: role.name,
        description: `Created role "${role.name}" with ${role.permissions.length} permissions`,
        ipAddress: ip,
        metadata: { role_name: role.name, permissions_count: role.permissions.length },
      });

      return res
        .status(HttpStatus.OK)
        .json({ message: `Role ${i18n.t('responses.created')}` });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }

  // ------------------------------------------------------------- Get All Roles -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-roles',
    summary: 'Get all roles.',
  })
  @ApiOkResponse(response.roles_list)
  @RequirePermission('roles.view')
  @Get('/')
  async getAllRoles(
    @Res() res: Response,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
    @Query() queries: PermissionQueries,
  ) {
    try {
      const admin = (req as any).user;
      const filterAdminId = getDataFilterAdminId(admin);

      const { count, rows: roles } = await this.rolesService.getAllRoles(
        queries,
        filterAdminId,
      );
      return res.status(HttpStatus.OK).json({
        message: `Role ${i18n.t('responses.list')}`,
        data: { total_count: count, roles: roles },
      });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: error.message });
    }
  }

  // ------------------------------------------------------------- Get Role Details -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'role-show',
    summary: 'Get role details.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.role_details)
  @RequirePermission('roles.view')
  @Get('/:uuid/show')
  async getRoleDetails(
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
  ) {
    try {
      // Get Role Details.
      const roleDetails = await this.rolesService.getRoleDetail(uuid);
      if (!roleDetails) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'Role ' + i18n.t('responses.not_found') });
      }

      // Data-level filtering: Check view access
      const admin = (req as any).user;
      const hasFullAccess = hasFullDataAccess(admin);
      if (!this.rolesService.canViewRole(roleDetails, admin, hasFullAccess)) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json({ message: 'You do not have permission to view this role' });
      }

      return res.status(HttpStatus.OK).json({
        message: `Role ${i18n.t('responses.details')}`,
        data: roleDetails,
      });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: error.message });
    }
  }

  // ------------------------------------------------------------- Update Role -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'update-role',
    summary: 'Update role.',
  })
  @ApiConflictResponse(response.conflict)
  @ApiNotFoundResponse(response.not_found)
  @ApiBadRequestResponse(response.badRequest)
  @ApiOkResponse(response.ok)
  // @ApiConsumes(consumers.formURLEncoded)
  @ApiParam({ name: 'uuid', type: String })
  @RequirePermission('roles.edit')
  @Patch('/:uuid/update')
  async updateRole(
    @Param('uuid') uuid: string,
    @Body() role: CreateRoleDto,
    @Res() res: Response,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
  ) {
    try {
      if (role.permissions.length === 0) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: `Permission ${i18n.t('responses.not_selected')}` });
      }

      const roleDetails = await this.rolesService.getRoleDetail(uuid);
      if (!roleDetails) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: `Role ${i18n.t('responses.not_found')}` });
      }

      // Check if role is protected (system role)
      if (this.rolesService.isProtectedRole(roleDetails.name)) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json({ message: 'System roles cannot be modified.' });
      }

      // Data-level filtering: Check modify access (sub-admins can't modify global roles)
      const admin = (req as any).user;
      const hasFullAccess = hasFullDataAccess(admin);
      if (!this.rolesService.canModifyRole(roleDetails, admin, hasFullAccess)) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json({ message: 'You do not have permission to update this role' });
      }

      if (roleDetails.name !== role.name) {
        // Check Role is Exist or not
        const checkRole = await this.rolesService.checkRole(role.name);
        if (checkRole !== 0) {
          return res
            .status(HttpStatus.CONFLICT)
            .json({ message: `Role ${i18n.t('responses.already_exist')}` });
        }
      }

      const checkPermissions = await this.permissionService.checkPermission(
        role.permissions,
      );
      if (!checkPermissions) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: `Permission ${i18n.t('responses.not_found')}` });
      }

      const updatedRole = await this.rolesService.update(uuid, role.name);
      const updatePermissions = await this.rolesService.updatePermissions(
        roleDetails.id,
        role.permissions,
      );
      if (updatedRole[0] === 0 && !updatePermissions) {
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ message: i18n.t('responses.error_occurred') });
      }

      // Log activity (includes permission changes)
      await this.activityLogsService.logActivity({
        adminId: admin?.id,
        action: 'UPDATE',
        entityType: 'role',
        entityId: uuid,
        entityName: role.name,
        description: `Updated role "${role.name}" (permissions may have changed)`,
        ipAddress: ip,
        metadata: {
          old_name: roleDetails.name,
          new_name: role.name,
          permissions_count: role.permissions.length,
        },
      });

      return res
        .status(HttpStatus.OK)
        .json({ message: `Role ${i18n.t('responses.updated')}` });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }

  // ------------------------------------------------------------- Delete Role -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'delete-role',
    summary: 'Delete role.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', type: String })
  @RequirePermission('roles.delete')
  @Delete('/:uuid/destroy')
  async deleteRole(
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
  ) {
    try {
      const roleDetails = await this.rolesService.getRoleDetail(uuid);
      if (!roleDetails) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: `Role ${i18n.t('responses.not_found')}` });
      }

      // Check if role is protected (system role)
      if (this.rolesService.isProtectedRole(roleDetails.name)) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json({ message: 'System roles cannot be deleted.' });
      }

      // Data-level filtering: Check modify access (sub-admins can't delete global roles)
      const admin = (req as any).user;
      const hasFullAccess = hasFullDataAccess(admin);
      if (!this.rolesService.canModifyRole(roleDetails, admin, hasFullAccess)) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json({ message: 'You do not have permission to delete this role' });
      }

      // Check if admins are assigned to this role
      const assignedCount = await this.rolesService.getAssignedAdminsCount(roleDetails.id);
      if (assignedCount > 0) {
        return res
          .status(HttpStatus.CONFLICT)
          .json({
            message: `Cannot delete role. ${assignedCount} admin${assignedCount > 1 ? 's are' : ' is'} assigned to this role. Please reassign them first.`,
          });
      }

      const deleteRole = await this.rolesService.deleteRole(
        roleDetails.dataValues.id,
      );
      if (!deleteRole) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: `Role ${i18n.t('responses.not_found')}` });
      }

      // Log activity
      await this.activityLogsService.logActivity({
        adminId: admin?.id,
        action: 'DELETE',
        entityType: 'role',
        entityId: uuid,
        entityName: roleDetails.name,
        description: `Deleted role "${roleDetails.name}"`,
        ipAddress: ip,
      });

      return res
        .status(HttpStatus.OK)
        .json({ message: `Role ${i18n.t('responses.deleted')}` });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }
}
