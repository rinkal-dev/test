import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Res,
  Req,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiOkResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/decorators/require-permission.decorator';
import { ActivityLogsService } from './activity-logs.service';
import { getDataFilterAdminId } from 'src/helpers/data-ownership.helper';

@ApiTags('Admin - Activity Logs')
@ApiBearerAuth()
@Controller({ version: '1', path: 'admin/activity-logs' })
@UseGuards(JwtAdminAuthGuard, PermissionGuard)
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  @RequirePermission('activity-logs.view')
  @ApiOperation({ summary: 'Get activity logs with filters and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'entity_type', required: false, type: String })
  @ApiQuery({ name: 'admin_id', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'start_date', required: false, type: String })
  @ApiQuery({ name: 'end_date', required: false, type: String })
  @ApiOkResponse({ description: 'Activity logs retrieved successfully' })
  async getActivityLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('entity_type') entityType?: string,
    @Query('admin_id') adminId?: string,
    @Query('search') search?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Req() req?: Request,
    @Res() res?: Response,
  ) {
    try {
      // Data-level filtering: Sub-admins can only see their own activity logs
      const admin = (req as any).user;
      const filterAdminId = getDataFilterAdminId(admin);

      const result = await this.activityLogsService.getActivityLogs({
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        action: action || undefined,
        entityType: entityType || undefined,
        adminId: adminId ? parseInt(adminId, 10) : undefined,
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        filterAdminId, // For data-level filtering
      });

      return res.status(HttpStatus.OK).json({
        message: 'Activity logs retrieved successfully',
        data: {
          logs: result.logs.map((log) => ({
            uuid: log.uuid,
            action: log.action,
            entity_type: log.entity_type,
            entity_id: log.entity_id,
            entity_name: log.entity_name,
            description: log.description,
            metadata: log.metadata,
            ip_address: log.ip_address,
            user_agent: log.user_agent,
            request_path: log.request_path,
            request_method: log.request_method,
            created_at: log.created_at,
            admin: log.admin
              ? {
                  uuid: log.admin.uuid,
                  name: log.admin.name,
                  email: log.admin.email,
                }
              : null,
          })),
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            total_pages: result.totalPages,
          },
        },
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to retrieve activity logs',
        error: error.message,
      });
    }
  }

  @Get('actions')
  @RequirePermission('activity-logs.view')
  @ApiOperation({ summary: 'Get distinct action types' })
  @ApiOkResponse({ description: 'Action types retrieved successfully' })
  async getActionTypes(@Res() res: Response) {
    try {
      const actions = await this.activityLogsService.getActionTypes();
      return res.status(HttpStatus.OK).json({
        message: 'Action types retrieved successfully',
        data: { actions },
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to retrieve action types',
        error: error.message,
      });
    }
  }

  @Get('entity-types')
  @RequirePermission('activity-logs.view')
  @ApiOperation({ summary: 'Get distinct entity types' })
  @ApiOkResponse({ description: 'Entity types retrieved successfully' })
  async getEntityTypes(@Res() res: Response) {
    try {
      const entityTypes = await this.activityLogsService.getEntityTypes();
      return res.status(HttpStatus.OK).json({
        message: 'Entity types retrieved successfully',
        data: { entity_types: entityTypes },
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to retrieve entity types',
        error: error.message,
      });
    }
  }

  @Get(':uuid')
  @RequirePermission('activity-logs.view')
  @ApiOperation({ summary: 'Get activity log by UUID' })
  @ApiOkResponse({ description: 'Activity log retrieved successfully' })
  async getActivityLogByUuid(
    @Param('uuid') uuid: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Data-level filtering: Sub-admins can only see their own activity logs
      const admin = (req as any).user;
      const filterAdminId = getDataFilterAdminId(admin);

      const log = await this.activityLogsService.getActivityLogByUuid(uuid);

      if (!log) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Activity log not found',
        });
      }

      // Check ownership for sub-admins
      if (filterAdminId !== null && log.admin_id !== filterAdminId) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Activity log not found',
        });
      }

      return res.status(HttpStatus.OK).json({
        message: 'Activity log retrieved successfully',
        data: {
          uuid: log.uuid,
          action: log.action,
          entity_type: log.entity_type,
          entity_id: log.entity_id,
          entity_name: log.entity_name,
          description: log.description,
          metadata: log.metadata,
          ip_address: log.ip_address,
          user_agent: log.user_agent,
          request_path: log.request_path,
          request_method: log.request_method,
          created_at: log.created_at,
          admin: log.admin
            ? {
                uuid: log.admin.uuid,
                name: log.admin.name,
                email: log.admin.email,
              }
            : null,
        },
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to retrieve activity log',
        error: error.message,
      });
    }
  }

  @Get('entity/:entityType/:entityId')
  @RequirePermission('activity-logs.view')
  @ApiOperation({ summary: 'Get activities for a specific entity' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Entity activities retrieved successfully' })
  async getEntityActivities(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('limit') limit?: string,
    @Req() req?: Request,
    @Res() res?: Response,
  ) {
    try {
      // Data-level filtering: Sub-admins can only see their own activity logs
      const admin = (req as any).user;
      const filterAdminId = getDataFilterAdminId(admin);

      const logs = await this.activityLogsService.getEntityActivities(
        entityType,
        entityId,
        limit ? parseInt(limit, 10) : 10,
        filterAdminId,
      );

      return res.status(HttpStatus.OK).json({
        message: 'Entity activities retrieved successfully',
        data: {
          logs: logs.map((log) => ({
            uuid: log.uuid,
            action: log.action,
            description: log.description,
            metadata: log.metadata,
            created_at: log.created_at,
            admin: log.admin
              ? {
                  uuid: log.admin.uuid,
                  name: log.admin.name,
                  email: log.admin.email,
                }
              : null,
          })),
        },
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to retrieve entity activities',
        error: error.message,
      });
    }
  }
}
