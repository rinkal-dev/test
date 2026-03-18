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
  Req,
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
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { Response, Request } from 'express';
import { WeddingGroupsService } from './wedding-groups.service';
import { CreateWeddingGroupDto } from './dto/CreateWeddingGroupDto';
import { UpdateWeddingGroupDto } from './dto/UpdateWeddingGroupDto';
import { WeddingGroupQueryDto } from './dto/WeddingGroupQueryDto';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/decorators/require-permission.decorator';
import { headers, response, tags } from 'src/swagger/Base';
import { getTimezoneList } from 'src/helpers/timezone.helper';
import { getDataFilterAdminId, hasFullDataAccess } from 'src/helpers/data-ownership.helper';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard, PermissionGuard)
@ApiHeaders([headers.accept, headers.accept_language])
@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiUnauthorizedResponse(response.unauthorized)
@ApiUnprocessableEntityResponse(response.validationException)
@ApiTags(tags.WEDDING_GROUPS || 'Wedding Groups')
@Controller({ version: '1', path: 'wedding-groups' })
export class WeddingGroupsController {
  constructor(
    private readonly weddingGroupsService: WeddingGroupsService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  // ------------------------------------------------------------- Create Wedding Group -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'create-wedding-group',
    summary: 'Create a new wedding group.',
  })
  @ApiOkResponse(response.ok)
  @RequirePermission('wedding-groups.create')
  @Post('/')
  async create(
    @Body() createDto: CreateWeddingGroupDto,
    @Req() req: Request,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
  ) {
    try {
      // Get admin ID from JWT token
      const adminId = (req as any).user?.id;

      const weddingGroup = await this.weddingGroupsService.create(createDto, adminId);

      // Log activity
      await this.activityLogsService.logActivity({
        adminId,
        action: 'CREATE',
        entityType: 'wedding_group',
        entityId: weddingGroup.uuid,
        entityName: createDto.name,
        description: `Created wedding group "${createDto.name}"`,
        ipAddress: ip,
        metadata: { group_name: createDto.name },
      });

      return res.status(HttpStatus.CREATED).json({
        message: `Wedding Group ${i18n.t('responses.created')}`,
        data: weddingGroup,
      });
    } catch (error) {
      console.error('Error creating wedding group:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Get All Wedding Groups -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-all-wedding-groups',
    summary: 'Get all wedding groups with pagination and filters.',
  })
  @ApiOkResponse(response.ok)
  @RequirePermission('wedding-groups.view')
  @Get('/')
  async findAll(
    @Query() query: WeddingGroupQueryDto,
    @Req() req: Request,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      // Data-level filtering: Non-super users only see their own data
      const admin = (req as any).user;
      const filterAdminId = getDataFilterAdminId(admin);
      if (filterAdminId !== null) {
        query.created_by = filterAdminId;
      }

      const { count, rows: weddingGroups } = await this.weddingGroupsService.findAll(query);
      return res.status(HttpStatus.OK).json({
        message: `Wedding Groups ${i18n.t('responses.list')}`,
        data: {
          total_count: count,
          page: query.page || 1,
          limit: query.limit || 10,
          wedding_groups: weddingGroups,
        },
      });
    } catch (error) {
      console.error('Error fetching wedding groups:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Get Active Count -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-active-wedding-groups-count',
    summary: 'Get count of active wedding groups (for dashboard).',
  })
  @ApiOkResponse(response.ok)
  @RequirePermission('wedding-groups.view')
  @Get('/stats/active-count')
  async getActiveCount(
    @Req() req: Request,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      // Data-level filtering: Non-super users only see their own data count
      const admin = (req as any).user;
      const filterAdminId = getDataFilterAdminId(admin);
      const count = await this.weddingGroupsService.getActiveCount(filterAdminId);
      return res.status(HttpStatus.OK).json({
        message: 'Active wedding groups count',
        data: { active_count: count },
      });
    } catch (error) {
      console.error('Error getting active count:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Get Available Timezones -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-available-timezones',
    summary: 'Get list of available timezones for wedding group configuration.',
  })
  @ApiOkResponse({
    description: 'List of available timezones',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              value: { type: 'string', example: 'America/Cancun' },
              label: { type: 'string', example: 'Cancun, Mexico (America/Cancun)' },
            },
          },
        },
      },
    },
  })
  @RequirePermission('wedding-groups.view')
  @Get('/timezones')
  async getTimezones(@Res() res: Response) {
    const timezones = getTimezoneList();
    return res.status(HttpStatus.OK).json({
      message: 'Available timezones',
      data: timezones,
    });
  }

  // ------------------------------------------------------------- Check Slug Availability -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'check-slug-availability',
    summary: 'Check if a booking link slug is available.',
  })
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'slug', type: String, description: 'The slug to check for availability' })
  @RequirePermission('wedding-groups.view')
  @Get('/check-slug/:slug')
  async checkSlugAvailability(
    @Param('slug') slug: string,
    @Res() res: Response,
  ) {
    try {
      if (!slug || slug.length < 3) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Slug must be at least 3 characters',
          data: { available: false, slug },
        });
      }

      const exists = await this.weddingGroupsService.isBookingLinkExists(slug);

      // If slug is taken, generate suggestions
      let suggestions: string[] = [];
      if (exists) {
        // Generate numbered suggestions
        const baseSuggestions = await Promise.all([
          this.weddingGroupsService.isBookingLinkExists(`${slug}-2`),
          this.weddingGroupsService.isBookingLinkExists(`${slug}-3`),
          this.weddingGroupsService.isBookingLinkExists(`${slug}-wedding`),
        ]);

        if (!baseSuggestions[0]) suggestions.push(`${slug}-2`);
        if (!baseSuggestions[1]) suggestions.push(`${slug}-3`);
        if (!baseSuggestions[2]) suggestions.push(`${slug}-wedding`);

        // If none of those are available, try to generate a unique one
        if (suggestions.length === 0) {
          const uniqueSlug = await this.weddingGroupsService.generateBookingLink(slug);
          suggestions.push(uniqueSlug);
        }
      }

      return res.status(HttpStatus.OK).json({
        message: exists ? 'Slug is already taken' : 'Slug is available',
        data: {
          available: !exists,
          slug,
          suggestions: exists ? suggestions : undefined,
        },
      });
    } catch (error) {
      console.error('Error checking slug availability:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Get Wedding Group by UUID -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-wedding-group-details',
    summary: 'Get wedding group details by UUID with protection info.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', type: String })
  @RequirePermission('wedding-groups.view')
  @Get('/:uuid')
  async findOne(
    @Param('uuid') uuid: string,
    @Req() req: Request,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const result = await this.weddingGroupsService.findByUuidWithProtection(uuid);
      if (!result) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      // Data-level filtering: Check ownership for non-super users
      const admin = (req as any).user;
      if (!hasFullDataAccess(admin) && result.group.created_by !== admin.id) {
        return res.status(HttpStatus.FORBIDDEN).json({
          message: 'You do not have permission to view this wedding group',
        });
      }

      // Get total revenue for computed field
      const totalRevenue = await this.weddingGroupsService.getTotalRevenue(result.group.id);

      return res.status(HttpStatus.OK).json({
        message: `Wedding Group ${i18n.t('responses.details')}`,
        data: {
          ...result.group,
          // Add computed fields for frontend display
          bookings_count: result.protection.stats.totalBookings,
          total_revenue: totalRevenue,
          _protection: result.protection,
        },
      });
    } catch (error) {
      console.error('Error fetching wedding group:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Update Wedding Group -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'update-wedding-group',
    summary: 'Update wedding group details.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', type: String })
  @RequirePermission('wedding-groups.edit')
  @Patch('/:uuid')
  async update(
    @Param('uuid') uuid: string,
    @Body() updateDto: UpdateWeddingGroupDto,
    @Req() req: Request,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
  ) {
    try {
      // Check if wedding group exists
      const existingGroup = await this.weddingGroupsService.findByUuid(uuid);
      if (!existingGroup) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      // Data-level filtering: Check ownership for non-super users
      const admin = (req as any).user;
      if (!hasFullDataAccess(admin) && existingGroup.created_by !== admin.id) {
        return res.status(HttpStatus.FORBIDDEN).json({
          message: 'You do not have permission to edit this wedding group',
        });
      }

      await this.weddingGroupsService.update(uuid, updateDto);

      // Log activity
      await this.activityLogsService.logActivity({
        adminId: admin?.id,
        action: 'UPDATE',
        entityType: 'wedding_group',
        entityId: uuid,
        entityName: existingGroup.name,
        description: `Updated wedding group "${existingGroup.name}"`,
        ipAddress: ip,
        metadata: { changes: Object.keys(updateDto) },
      });

      return res.status(HttpStatus.OK).json({
        message: `Wedding Group ${i18n.t('responses.updated')}`,
      });
    } catch (error) {
      console.error('Error updating wedding group:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Delete Wedding Group -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'delete-wedding-group',
    summary: 'Delete a wedding group.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', type: String })
  @RequirePermission('wedding-groups.delete')
  @Delete('/:uuid')
  async delete(
    @Param('uuid') uuid: string,
    @Req() req: Request,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
  ) {
    try {
      const existingGroup = await this.weddingGroupsService.findByUuid(uuid);
      if (!existingGroup) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      // Data-level filtering: Check ownership for non-super users
      const admin = (req as any).user;
      if (!hasFullDataAccess(admin) && existingGroup.created_by !== admin.id) {
        return res.status(HttpStatus.FORBIDDEN).json({
          message: 'You do not have permission to delete this wedding group',
        });
      }

      await this.weddingGroupsService.delete(uuid);

      // Log activity
      await this.activityLogsService.logActivity({
        adminId: admin?.id,
        action: 'DELETE',
        entityType: 'wedding_group',
        entityId: uuid,
        entityName: existingGroup.name,
        description: `Deleted wedding group "${existingGroup.name}"`,
        ipAddress: ip,
      });

      return res.status(HttpStatus.OK).json({
        message: `Wedding Group ${i18n.t('responses.deleted')}`,
      });
    } catch (error) {
      console.error('Error deleting wedding group:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Change Wedding Group Status -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'change-wedding-group-status',
    summary: 'Change wedding group status (draft, active, completed, cancelled).',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', type: String })
  @Patch('/:uuid/status')
  async changeStatus(
    @Param('uuid') uuid: string,
    @Body('status') status: 'draft' | 'active' | 'completed' | 'cancelled',
    @Req() req: Request,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
  ) {
    try {
      const existingGroup = await this.weddingGroupsService.findByUuid(uuid);
      if (!existingGroup) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const validStatuses = ['draft', 'active', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
      }

      // Data-level filtering: Check ownership for non-super users
      const admin = (req as any).user;
      if (!hasFullDataAccess(admin) && existingGroup.created_by !== admin.id) {
        return res.status(HttpStatus.FORBIDDEN).json({
          message: 'You do not have permission to change status of this wedding group',
        });
      }

      // Permission check based on action
      const roleNames = admin?.roles?.map((role: any) => typeof role === 'string' ? role : role.name) || [];
      const isSuperRole = roleNames.includes('Developer') || roleNames.includes('Super Admin');

      if (!isSuperRole) {
        const userPermissions: string[] = [];
        for (const role of admin?.roles || []) {
          if (role.permissions && Array.isArray(role.permissions)) {
            for (const permission of role.permissions) {
              const permName = typeof permission === 'string' ? permission : permission.name;
              if (permName && !userPermissions.includes(permName)) {
                userPermissions.push(permName);
              }
            }
          }
        }

        // Determine required permission based on status transition
        let requiredPermission: string;
        let actionName: string;

        if (status === 'cancelled') {
          // Cancel action
          requiredPermission = 'wedding-groups.cancel';
          actionName = 'cancel';
        } else if (status === 'active' && existingGroup.status === 'draft') {
          // Publish action (draft -> active)
          requiredPermission = 'wedding-groups.publish';
          actionName = 'publish';
        } else if (status === 'draft' && existingGroup.status === 'active') {
          // Pause action (active -> draft)
          requiredPermission = 'wedding-groups.pause';
          actionName = 'pause';
        } else if (status === 'completed') {
          // Close action (active -> completed)
          requiredPermission = 'wedding-groups.close';
          actionName = 'close';
        } else if (status === 'active' && existingGroup.status === 'completed') {
          // Activate/Reopen action (completed -> active)
          requiredPermission = 'wedding-groups.activate';
          actionName = 'reopen';
        } else {
          // Default to edit permission
          requiredPermission = 'wedding-groups.edit';
          actionName = 'edit';
        }

        if (!userPermissions.includes(requiredPermission)) {
          return res.status(HttpStatus.FORBIDDEN).json({
            message: `You do not have permission to ${actionName} wedding groups`,
          });
        }
      }

      // Use the update method which enforces smart protection
      // This ensures status changes respect payment-based restrictions
      await this.weddingGroupsService.update(uuid, { status: status as any });

      // Map database status to user-friendly display names
      const statusDisplayNames: Record<string, string> = {
        draft: 'Draft',
        active: 'Active',
        completed: 'Closed',
        cancelled: 'Cancelled',
      };
      const oldStatusDisplay = statusDisplayNames[existingGroup.status] || existingGroup.status;
      const newStatusDisplay = statusDisplayNames[status] || status;

      // Log activity
      await this.activityLogsService.logActivity({
        adminId: admin?.id,
        action: 'STATUS_CHANGE',
        entityType: 'wedding_group',
        entityId: uuid,
        entityName: existingGroup.name,
        description: `Changed wedding group "${existingGroup.name}" status from "${oldStatusDisplay}" to "${newStatusDisplay}"`,
        ipAddress: ip,
        metadata: { old_status: existingGroup.status, new_status: status },
      });

      return res.status(HttpStatus.OK).json({
        message: `Wedding Group ${i18n.t('responses.status_change')}`,
      });
    } catch (error) {
      console.error('Error changing wedding group status:', error);

      // Return proper status code for BadRequestException
      if (error.status === 400) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: error.message,
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Mark Invitations Sent -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'mark-invitations-sent',
    summary: 'Mark invitations as sent for a wedding group.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', type: String })
  @RequirePermission('wedding-groups.edit')
  @Patch('/:uuid/invitations-sent')
  async markInvitationsSent(
    @Param('uuid') uuid: string,
    @Req() req: Request,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
  ) {
    try {
      const existingGroup = await this.weddingGroupsService.findByUuid(uuid);
      if (!existingGroup) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      // Data-level filtering: Check ownership for non-super users
      const admin = (req as any).user;
      if (!hasFullDataAccess(admin) && existingGroup.created_by !== admin.id) {
        return res.status(HttpStatus.FORBIDDEN).json({
          message: 'You do not have permission to update this wedding group',
        });
      }

      await this.weddingGroupsService.markInvitationsSent(uuid);

      // Log activity
      await this.activityLogsService.logActivity({
        adminId: admin?.id,
        action: 'INVITATIONS_SENT',
        entityType: 'wedding_group',
        entityId: uuid,
        entityName: existingGroup.name,
        description: `Marked invitations as sent for wedding group "${existingGroup.name}"`,
        ipAddress: ip,
      });

      return res.status(HttpStatus.OK).json({
        message: 'Invitations marked as sent',
      });
    } catch (error) {
      console.error('Error marking invitations sent:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Get Wedding Groups by Hotel -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-wedding-groups-by-hotel',
    summary: 'Get all wedding groups for a specific hotel.',
  })
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'hotelId', type: Number })
  @RequirePermission('wedding-groups.view')
  @Get('/hotel/:hotelId')
  async findByHotel(
    @Param('hotelId') hotelId: number,
    @Req() req: Request,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      // Data-level filtering: Non-super users only see their own data
      const admin = (req as any).user;
      const filterAdminId = getDataFilterAdminId(admin);
      const weddingGroups = await this.weddingGroupsService.findByHotelId(hotelId, filterAdminId);
      return res.status(HttpStatus.OK).json({
        message: `Wedding Groups ${i18n.t('responses.list')}`,
        data: weddingGroups,
      });
    } catch (error) {
      console.error('Error fetching wedding groups by hotel:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Generate Booking Link Preview -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'preview-booking-link',
    summary: 'Preview what booking link would be generated for given names.',
  })
  @ApiOkResponse(response.ok)
  @RequirePermission('wedding-groups.view')
  @Get('/booking-link/preview')
  async previewBookingLink(
    @Query('bride_name') brideName: string,
    @Query('groom_name') groomName: string,
    @Res() res: Response,
  ) {
    try {
      if (!brideName || !groomName) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Both bride_name and groom_name are required',
        });
      }

      const bookingLink = await this.weddingGroupsService.generateBookingLink(
        `${brideName}-${groomName}`,
      );
      return res.status(HttpStatus.OK).json({
        message: 'Booking link preview',
        data: { booking_link: bookingLink },
      });
    } catch (error) {
      console.error('Error generating booking link preview:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message,
      });
    }
  }
}
