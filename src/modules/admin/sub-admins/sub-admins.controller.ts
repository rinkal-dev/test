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
  ApiConsumes,
  ApiHeaders,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { Response, Request } from 'express';
import { SubAdminService } from './sub-admins.service';
import { CreateSubAdminDto } from './dto/CreateSubAdminDto';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/decorators/require-permission.decorator';
import { getDataFilterAdminId, hasFullDataAccess } from 'src/helpers/data-ownership.helper';
import { consumers, headers, response, tags } from 'src/swagger/Base';
import { ChangeStatusDto } from './dto/ChangeStatusDto';
import { SubAdminQueries } from 'src/swagger/schema/SubAdminQueries';
import { ADMIN_TOKENABLE_TYPE } from 'src/config/constants';
import { generateRandomPassword } from 'src/helpers/general';
import * as bcrypt from 'bcrypt';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard, PermissionGuard)
@ApiHeaders([headers.accept, headers.accept_language])
@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiUnauthorizedResponse(response.unauthorized)
@ApiUnprocessableEntityResponse(response.validationException)
@ApiTags(tags.SUB_ADMIN)
@Controller({ version: '1', path: 'sub-admins' })
export class SubAdminController {
  constructor(
    private readonly subAdminService: SubAdminService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  // ------------------------------------------------------------- Create Sub Admin -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'create-sub-admin',
    summary: 'Create Sub Admin.',
  })
  @ApiConflictResponse(response.conflict)
  @ApiNotFoundResponse(response.not_found)
  @ApiBadRequestResponse(response.badRequest)
  @ApiOkResponse(response.ok)
  // @ApiConsumes(consumers.formURLEncoded)
  @RequirePermission('users.create')
  @Post('/store')
  async createSubAdmin(
    @Body() subAdmin: CreateSubAdminDto,
    @Res() res: Response,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
  ) {
    try {
      const admin = req.user as any;

      // Check Role is selected or not.
      if (subAdmin.roles.length === 0) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: `Role ${i18n.t('responses.not_selected')}` });
      }

      // Check Email is Exist or not
      const checkEmail = await this.subAdminService.checkEmail(subAdmin.email);
      if (checkEmail !== 0) {
        return res
          .status(HttpStatus.CONFLICT)
          .json({ message: `Email ${i18n.t('responses.already_exist')}` });
      }

      // Check Role is Exist or not
      const checkRole = await this.subAdminService.checkRole(subAdmin.roles);
      if (!checkRole) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: `Role ${i18n.t('responses.not_found')}` });
      }
      // Create Sub admin (track who created it)
      const { admin: addAdmin, plainPassword } = await this.subAdminService.createSubAdmin(subAdmin, admin.id);
      if (!addAdmin) {
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ message: i18n.t('responses.error_occurred') });
      }
      await this.subAdminService.addRole(
        addAdmin.id,
        subAdmin.roles,
        ADMIN_TOKENABLE_TYPE,
      );

      // Send welcome email to the new sub-admin with random password
      const roleName = await this.subAdminService.getRoleNameById(subAdmin.roles[0]);
      this.subAdminService.sendSubAdminCreatedEmail(
        subAdmin.email,
        subAdmin.name,
        plainPassword,
        roleName,
      );

      // Log activity
      await this.activityLogsService.logActivity({
        adminId: admin.id,
        action: 'CREATE',
        entityType: 'admin',
        entityId: addAdmin.uuid,
        entityName: subAdmin.name,
        description: `Created sub-admin "${subAdmin.name}" (${subAdmin.email}) with role "${roleName}"`,
        ipAddress: ip,
        metadata: { email: subAdmin.email, role: roleName },
      });

      return res
        .status(HttpStatus.OK)
        .json({ message: `Sub Admin ${i18n.t('responses.created')}` });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: error.message });
    }
  }

  // ------------------------------------------------------------- Get All Sub Admins -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-sub-admin',
    summary: 'Get all Sub Admin.',
  })
  @ApiOkResponse(response.sub_admin_list)
  @RequirePermission('users.view')
  @Get('/')
  async getAllSubAdmins(
    @Res() res: Response,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
    @Query() queries: SubAdminQueries,
  ) {
    try {
      const admin = req.user as any;
      const filterAdminId = getDataFilterAdminId(admin);

      const { count, rows: subAdmins } =
        await this.subAdminService.getAllSubAdmins(queries, filterAdminId);
      return res.status(HttpStatus.OK).json({
        message: `Sub Admin ${i18n.t('responses.list')}`,
        data: { total_count: count, sub_admins: subAdmins },
      });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }

  // ------------------------------------------------------------- Get Sub Admin Details -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'sub-admin-details',
    summary: 'Get Sub Admin details.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.sub_admin_details)
  @ApiParam({ name: 'uuid', type: String })
  @RequirePermission('users.view')
  @Get('/:uuid/show')
  async getSubAdminDetails(
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const admin = req.user as any;

      // Get Sub Admin Details.
      const subAdminDetails = await this.subAdminService.getSubAdminDetails(
        uuid,
      );
      if (!subAdminDetails) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'Sub Admin ' + i18n.t('responses.not_found') });
      }

      // Check ownership: Only allow access if you created this sub-admin (or have full access)
      if (!hasFullDataAccess(admin) && subAdminDetails.created_by !== admin.id) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json({ message: 'You do not have access to this sub-admin' });
      }

      return res.status(HttpStatus.OK).json({
        message: `Sub Admin ${i18n.t('responses.details')}`,
        data: subAdminDetails,
      });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }

  // ------------------------------------------------------------- Update Sub Admin -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'update-sub-admin',
    summary: 'Update Sub Admin.',
  })
  @ApiConflictResponse(response.conflict)
  @ApiNotFoundResponse(response.not_found)
  @ApiBadRequestResponse(response.badRequest)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', type: 'string' })
  @RequirePermission('users.edit')
  @Patch('/:uuid/update')
  async updateSubAdmin(
    @Param('uuid') uuid: string,
    @Body() subAdmin: CreateSubAdminDto,
    @Res() res: Response,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
  ) {
    try {
      const admin = req.user as any;

      // Get Sub Admin Details
      const subAdminDetails = await this.subAdminService.isExist(uuid);
      if (!subAdminDetails) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: `Sub Admin ${i18n.t('responses.not_found')}` });
      }

      // Check ownership: Only allow update if you created this sub-admin (or have full access)
      if (!hasFullDataAccess(admin) && subAdminDetails.created_by !== admin.id) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json({ message: 'You do not have access to update this sub-admin' });
      }

      // Check Email is Exist or not
      if (subAdminDetails.email !== subAdmin.email) {
        const checkEmail = await this.subAdminService.checkEmail(
          subAdmin.email,
        );
        if (checkEmail !== 0) {
          return res
            .status(HttpStatus.CONFLICT)
            .json({ message: `Email ${i18n.t('responses.already_exist')}` });
        }
      }

      // Check Role is Exist or not
      const checkRole = await this.subAdminService.checkRole(subAdmin.roles);
      if (!checkRole) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: `Role ${i18n.t('responses.not_found')}` });
      }

      const updateRoles = await this.subAdminService.updateRoles(
        subAdminDetails.id,
        subAdmin.roles,
      );
      if (!updateRoles) {
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ message: i18n.t('responses.update_role_error') });
      }

      // Check if email is changing to a new one
      const isEmailChanged = subAdminDetails.email !== subAdmin.email;

      // If email changed, generate new password
      let newPassword: string | null = null;
      const updateData: any = {
        name: subAdmin.name,
        email: subAdmin.email,
        is_active: subAdmin.is_active,
      };

      if (isEmailChanged) {
        newPassword = generateRandomPassword();
        updateData.password = bcrypt.hashSync(newPassword, 10);
      }

      // Update Sub admin
      const updateUser = await this.subAdminService.update(uuid, updateData);
      if (!updateUser) {
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ message: i18n.t('responses.internal_server_error') });
      }

      // Send email notification
      const roleName = await this.subAdminService.getRoleNameById(subAdmin.roles[0]);

      if (isEmailChanged && newPassword) {
        // Email changed - send new account email with new password
        this.subAdminService.sendSubAdminCreatedEmail(
          subAdmin.email,
          subAdmin.name,
          newPassword,
          roleName,
        );
      } else {
        // Same email - send update notification
        this.subAdminService.sendSubAdminUpdatedEmail(
          subAdmin.email,
          subAdmin.name,
          subAdmin.is_active,
          roleName,
        );
      }

      // Log activity
      await this.activityLogsService.logActivity({
        adminId: admin.id,
        action: 'UPDATE',
        entityType: 'admin',
        entityId: uuid,
        entityName: subAdmin.name,
        description: `Updated sub-admin "${subAdmin.name}" (${subAdmin.email})`,
        ipAddress: ip,
        metadata: { changes: ['name', 'email', 'roles', 'is_active'].filter(k => true) },
      });

      return res
        .status(HttpStatus.OK)
        .json({ message: `Sub Admin ${i18n.t('responses.updated')}` });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }

  // ------------------------------------------------------------- Delete Sub Admin -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'delete-sub-admin',
    summary: 'Delete Sub Admin.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @RequirePermission('users.delete')
  @Delete('/:uuid/destroy')
  async deleteSubAdmin(
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
  ) {
    try {
      const admin = req.user as any;

      const subAdminDetails = await this.subAdminService.isExist(uuid);
      if (!subAdminDetails) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: `Sub Admin ${i18n.t('responses.not_found')}` });
      }

      // Check ownership: Only allow delete if you created this sub-admin (or have full access)
      if (!hasFullDataAccess(admin) && subAdminDetails.created_by !== admin.id) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json({ message: 'You do not have access to delete this sub-admin' });
      }

      const deleteSubAdmin = await this.subAdminService.deleteSubAdmin(
        subAdminDetails.id,
      );
      if (!deleteSubAdmin) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: `Sub Admin ${i18n.t('responses.not_found')}` });
      }

      // Log activity
      await this.activityLogsService.logActivity({
        adminId: admin.id,
        action: 'DELETE',
        entityType: 'admin',
        entityId: uuid,
        entityName: subAdminDetails.name,
        description: `Deleted sub-admin "${subAdminDetails.name}" (${subAdminDetails.email})`,
        ipAddress: ip,
      });

      return res
        .status(HttpStatus.OK)
        .json({ message: `Sub Admin ${i18n.t('responses.deleted')}` });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }

  // --------------------------------------------------------------- Change Status ----------------------------------------------------------------------------
  @ApiOperation({
    operationId: 'sub-admin-status',
    summary: 'Change status of particular  Sub Admin.',
  })
  @ApiConsumes(consumers.formURLEncoded)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', type: String })
  @RequirePermission('users.activate')
  @Patch('/:uuid/activate')
  async changeStatus(
    @Res() res: Response,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
    @Body() body: ChangeStatusDto,
    @Param('uuid') uuid: string,
    @Ip() ip: string,
  ) {
    try {
      const admin = req.user as any;

      // Check if sub-admin exists and verify ownership
      const subAdminDetails = await this.subAdminService.isExist(uuid);
      if (!subAdminDetails) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: `Sub Admin ${i18n.t('responses.not_found')}` });
      }

      // Check ownership: Only allow status change if you created this sub-admin (or have full access)
      if (!hasFullDataAccess(admin) && subAdminDetails.created_by !== admin.id) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json({ message: 'You do not have access to change this sub-admin status' });
      }

      const changeStatus = await this.subAdminService.changeStatus(
        uuid,
        body.status,
      );
      if (!changeStatus[0]) {
        return res.status(HttpStatus.OK).json({
          message: `Sub Admin's ${i18n.t('responses.status_not_change')}`,
        });
      }

      // Log activity
      const action = body.status ? 'ACTIVATE' : 'DEACTIVATE';
      await this.activityLogsService.logActivity({
        adminId: admin.id,
        action,
        entityType: 'admin',
        entityId: uuid,
        entityName: subAdminDetails.name,
        description: `${body.status ? 'Activated' : 'Deactivated'} sub-admin "${subAdminDetails.name}" (${subAdminDetails.email})`,
        ipAddress: ip,
        metadata: { new_status: body.status },
      });

      return res.status(HttpStatus.OK).json({
        message: `Sub Admin's ${i18n.t('responses.status_change')}`,
      });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }
}
