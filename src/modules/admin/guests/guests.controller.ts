import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  Req,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Header,
  Ip,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiHeaders,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import { GuestsService } from './guests.service';
import {
  CreateGuestDto,
  UpdateGuestDto,
  GuestQueryDto,
  BulkInviteDto,
  SendInvitationDto,
} from './dto';
import { SendBroadcastDto, BroadcastAudience } from './dto/SendBroadcastDto';
import { GuestBroadcastService } from './guest-broadcast.service';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/decorators/require-permission.decorator';
import { headers, response } from 'src/swagger/Base';
import { getDataFilterAdminId, hasFullDataAccess } from 'src/helpers/data-ownership.helper';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard, PermissionGuard)
@ApiHeaders([headers.accept, headers.accept_language])
@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiUnauthorizedResponse(response.unauthorized)
@ApiTags('Guests')
@Controller({ version: '1', path: 'admin/guests' })
export class GuestsController {
  constructor(
    private readonly guestsService: GuestsService,
    private readonly broadcastService: GuestBroadcastService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  // ------------------------------------------------------------- List All Guests -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-guests',
    summary: 'Get all guests with pagination and filters',
  })
  @ApiOkResponse(response.ok)
  @RequirePermission('guests.view')
  @Get('/')
  async findAll(@Query() query: GuestQueryDto, @Req() req: Request, @Res() res: Response) {
    try {
      // Data-level filtering: Non-super users only see guests from their wedding groups
      const admin = (req as any).user;
      const filterAdminId = getDataFilterAdminId(admin);

      const result = await this.guestsService.findAll(query, filterAdminId);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Get Guests by Wedding Group -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-guests-by-group',
    summary: 'Get guests for a specific wedding group',
  })
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', description: 'Wedding group UUID' })
  @RequirePermission('guests.view')
  @Get('/group/:groupUuid')
  async findByWeddingGroup(
    @Param('groupUuid') groupUuid: string,
    @Query() query: GuestQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Data-level filtering: Check ownership of wedding group
      const admin = (req as any).user;
      const filterAdminId = getDataFilterAdminId(admin);

      const result = await this.guestsService.findByWeddingGroup(groupUuid, query, filterAdminId);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Get Guest Stats -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-guest-stats',
    summary: 'Get guest statistics for a wedding group',
  })
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', description: 'Wedding group UUID' })
  @RequirePermission('guests.view')
  @Get('/group/:groupUuid/stats')
  async getStats(@Param('groupUuid') groupUuid: string, @Req() req: Request, @Res() res: Response) {
    try {
      // Data-level filtering: Check ownership of wedding group
      const admin = (req as any).user;
      const filterAdminId = getDataFilterAdminId(admin);

      const stats = await this.guestsService.getStats(groupUuid, filterAdminId);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Export All Guests to CSV -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'export-all-guests',
    summary: 'Export all guests to CSV (includes wedding_group column)',
  })
  @ApiOkResponse({ description: 'CSV file with all guest data' })
  @RequirePermission('guests.view')
  @Header('Content-Type', 'text/csv')
  @Get('/export')
  async exportAllGuests(@Req() req: Request, @Res() res: Response) {
    try {
      // Data-level filtering: Non-super users only see guests from their wedding groups
      const admin = (req as any).user;
      const filterAdminId = getDataFilterAdminId(admin);

      const csv = await this.guestsService.exportGuestsToCsv(undefined, filterAdminId);
      res.setHeader('Content-Disposition', `attachment; filename="all-guests-export.csv"`);
      res.setHeader('Content-Type', 'text/csv');
      return res.status(HttpStatus.OK).send(csv);
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Get Single Guest -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-guest',
    summary: 'Get guest details by UUID',
  })
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', description: 'Guest UUID' })
  @RequirePermission('guests.view')
  @Get('/:uuid')
  async findOne(@Param('uuid') uuid: string, @Req() req: Request, @Res() res: Response) {
    try {
      const guest = await this.guestsService.findOne(uuid);

      // Data-level filtering: Check ownership via wedding group
      const admin = (req as any).user;
      if (!hasFullDataAccess(admin) && guest?.wedding_group?.created_by !== admin.id) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: 'You do not have permission to view this guest',
        });
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        data: guest,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Create Guest -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'create-guest',
    summary: 'Create a new guest',
  })
  @ApiOkResponse(response.ok)
  @RequirePermission('guests.create')
  @Post('/')
  async create(
    @Body() dto: CreateGuestDto,
    @Req() req: Request,
    @Res() res: Response,
    @Ip() ip: string,
  ) {
    try {
      // Data-level filtering: Check ownership of wedding group before creating
      const admin = (req as any).user;
      const filterAdminId = getDataFilterAdminId(admin);

      const guest = await this.guestsService.create(dto, filterAdminId);

      // Log activity
      await this.activityLogsService.logActivity({
        adminId: admin?.id,
        action: 'CREATE',
        entityType: 'guest',
        entityId: guest.uuid,
        entityName: dto.name,
        description: `Created guest "${dto.name}"`,
        ipAddress: ip,
        metadata: { email: dto.email, wedding_group_uuid: dto.wedding_group_uuid },
      });

      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: 'Guest created successfully',
        data: guest,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Update Guest -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'update-guest',
    summary: 'Update a guest',
  })
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', description: 'Guest UUID' })
  @RequirePermission('guests.edit')
  @Patch('/:uuid')
  async update(
    @Param('uuid') uuid: string,
    @Body() dto: UpdateGuestDto,
    @Req() req: Request,
    @Res() res: Response,
    @Ip() ip: string,
  ) {
    try {
      // Data-level filtering: Check ownership via wedding group
      const existingGuest = await this.guestsService.findOne(uuid);
      const admin = (req as any).user;
      if (!hasFullDataAccess(admin) && existingGuest?.wedding_group?.created_by !== admin.id) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: 'You do not have permission to edit this guest',
        });
      }

      const guest = await this.guestsService.update(uuid, dto);

      // Log activity
      await this.activityLogsService.logActivity({
        adminId: admin?.id,
        action: 'UPDATE',
        entityType: 'guest',
        entityId: uuid,
        entityName: existingGuest?.name,
        description: `Updated guest "${existingGuest?.name}"`,
        ipAddress: ip,
        metadata: { changes: Object.keys(dto) },
      });

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Guest updated successfully',
        data: guest,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Delete Guest -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'delete-guest',
    summary: 'Delete a guest (only if no bookings)',
  })
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', description: 'Guest UUID' })
  @RequirePermission('guests.delete')
  @Delete('/:uuid')
  async remove(
    @Param('uuid') uuid: string,
    @Req() req: Request,
    @Res() res: Response,
    @Ip() ip: string,
  ) {
    try {
      // Data-level filtering: Check ownership via wedding group
      const existingGuest = await this.guestsService.findOne(uuid);
      const admin = (req as any).user;
      if (!hasFullDataAccess(admin) && existingGuest?.wedding_group?.created_by !== admin.id) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: 'You do not have permission to delete this guest',
        });
      }

      const result = await this.guestsService.remove(uuid);

      // Log activity
      await this.activityLogsService.logActivity({
        adminId: admin?.id,
        action: 'DELETE',
        entityType: 'guest',
        entityId: uuid,
        entityName: existingGuest?.name,
        description: `Deleted guest "${existingGuest?.name}"`,
        ipAddress: ip,
      });

      return res.status(HttpStatus.OK).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Send Invitation -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'send-invitation',
    summary: 'Send invitation to a guest',
  })
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', description: 'Guest UUID' })
  @RequirePermission('guests.send-invitation')
  @Post('/:uuid/send-invitation')
  async sendInvitation(
    @Param('uuid') uuid: string,
    @Body() dto: SendInvitationDto,
    @Req() req: Request,
    @Res() res: Response,
    @Ip() ip: string,
  ) {
    try {
      // Data-level filtering: Check ownership via wedding group
      const existingGuest = await this.guestsService.findOne(uuid);
      const admin = (req as any).user;
      if (!hasFullDataAccess(admin) && existingGuest?.wedding_group?.created_by !== admin.id) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: 'You do not have permission to send invitations for this guest',
        });
      }

      const result = await this.guestsService.sendInvitation(uuid, dto.custom_message);

      // Log activity
      await this.activityLogsService.logActivity({
        adminId: admin?.id,
        action: 'SEND_INVITATION',
        entityType: 'guest',
        entityId: uuid,
        entityName: existingGuest?.name,
        description: `Sent invitation to guest "${existingGuest?.name}" (${existingGuest?.email})`,
        ipAddress: ip,
      });

      return res.status(HttpStatus.OK).json({
        success: true,
        message: result.message,
        data: result.guest,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Bulk Send Invitations -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'bulk-send-invitations',
    summary: 'Send invitations to multiple guests',
  })
  @ApiOkResponse(response.ok)
  @RequirePermission('guests.send-invitation')
  @Post('/bulk-invite')
  async bulkInvite(@Body() dto: BulkInviteDto, @Req() req: Request, @Res() res: Response) {
    try {
      // Data-level filtering: Check ownership of each guest before sending
      const admin = (req as any).user;
      if (!hasFullDataAccess(admin)) {
        // Verify all guests belong to wedding groups owned by this admin
        for (const guestUuid of dto.guest_uuids) {
          const guest = await this.guestsService.findOne(guestUuid);
          if (guest?.wedding_group?.created_by !== admin.id) {
            return res.status(HttpStatus.FORBIDDEN).json({
              success: false,
              message: 'You do not have permission to send invitations for one or more guests',
            });
          }
        }
      }

      const result = await this.guestsService.sendBulkInvitations(
        dto.guest_uuids,
        dto.custom_message,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: result.message,
        data: result.results,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Regenerate Access Token -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'regenerate-guest-token',
    summary: 'Regenerate access token for a guest',
  })
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', description: 'Guest UUID' })
  @RequirePermission('guests.edit')
  @Post('/:uuid/regenerate-token')
  async regenerateToken(@Param('uuid') uuid: string, @Req() req: Request, @Res() res: Response) {
    try {
      // Data-level filtering: Check ownership via wedding group
      const existingGuest = await this.guestsService.findOne(uuid);
      const admin = (req as any).user;
      if (!hasFullDataAccess(admin) && existingGuest?.wedding_group?.created_by !== admin.id) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: 'You do not have permission to regenerate token for this guest',
        });
      }

      const result = await this.guestsService.regenerateAccessToken(uuid);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: result.message,
        data: { access_token: result.access_token },
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Download CSV Template -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-guest-template',
    summary: 'Download CSV template for guest import',
  })
  @ApiOkResponse({ description: 'CSV file' })
  @ApiParam({ name: 'groupUuid', description: 'Wedding group UUID' })
  @RequirePermission('guests.create')
  @Header('Content-Type', 'text/csv')
  @Get('/group/:groupUuid/template')
  async downloadTemplate(
    @Param('groupUuid') groupUuid: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Data-level filtering: Check ownership of wedding group
      const admin = (req as any).user;
      const filterAdminId = getDataFilterAdminId(admin);
      if (filterAdminId !== null) {
        const groupData = await this.guestsService.getWeddingGroupDetails(groupUuid);
        if (!groupData) {
          return res.status(HttpStatus.NOT_FOUND).json({
            success: false,
            message: 'Wedding group not found',
          });
        }
      }

      const csv = this.guestsService.generateCsvTemplate();
      res.setHeader('Content-Disposition', `attachment; filename="guest-import-template.csv"`);
      res.setHeader('Content-Type', 'text/csv');
      return res.status(HttpStatus.OK).send(csv);
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Export Guests by Group to CSV -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'export-guests-by-group',
    summary: 'Export all guests from a wedding group to CSV',
  })
  @ApiOkResponse({ description: 'CSV file with guest data' })
  @ApiParam({ name: 'groupUuid', description: 'Wedding group UUID' })
  @RequirePermission('guests.view')
  @Header('Content-Type', 'text/csv')
  @Get('/group/:groupUuid/export')
  async exportGuests(
    @Param('groupUuid') groupUuid: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Data-level filtering: Check ownership of wedding group
      const admin = (req as any).user;
      const filterAdminId = getDataFilterAdminId(admin);

      const csv = await this.guestsService.exportGuestsToCsv(groupUuid, filterAdminId);
      res.setHeader('Content-Disposition', `attachment; filename="guests-export.csv"`);
      res.setHeader('Content-Type', 'text/csv');
      return res.status(HttpStatus.OK).send(csv);
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Validate Guest Import CSV -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'validate-guest-import',
    summary: 'Validate CSV file for guest import and return preview',
  })
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', description: 'Wedding group UUID' })
  @RequirePermission('guests.create')
  @UseInterceptors(FileInterceptor('file'))
  @Post('/group/:groupUuid/validate')
  async validateImport(
    @Param('groupUuid') groupUuid: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      if (!file) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      // Data-level filtering: Check ownership of wedding group
      const admin = (req as any).user;
      const filterAdminId = getDataFilterAdminId(admin);

      const result = await this.guestsService.validateCsvImport(groupUuid, file.buffer.toString('utf-8'), filterAdminId);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Confirm Guest Import -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'confirm-guest-import',
    summary: 'Confirm and execute guest import using validation token',
  })
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', description: 'Wedding group UUID' })
  @RequirePermission('guests.create')
  @Post('/group/:groupUuid/confirm-import')
  async confirmImport(
    @Param('groupUuid') groupUuid: string,
    @Body() body: { token: string; send_invitations?: boolean },
    @Req() req: Request,
    @Res() res: Response,
    @Ip() ip: string,
  ) {
    try {
      if (!body.token) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Validation token is required',
        });
      }

      // Data-level filtering: Check ownership of wedding group
      const admin = (req as any).user;
      const filterAdminId = getDataFilterAdminId(admin);

      const result = await this.guestsService.confirmImport(
        groupUuid,
        body.token,
        body.send_invitations || false,
        filterAdminId,
      );

      // Log activity for guest import
      await this.activityLogsService.logActivity({
        adminId: admin?.id,
        action: 'IMPORT',
        entityType: 'guest',
        entityId: groupUuid,
        entityName: `${result.imported || 0} Guest(s)`,
        description: `Imported ${result.imported || 0} guest(s) to wedding group`,
        ipAddress: ip,
        metadata: {
          wedding_group_uuid: groupUuid,
          guests_imported: result.imported || 0,
          invitations_sent: result.invitationsSent || 0,
          send_invitations: body.send_invitations || false,
        },
      });

      return res.status(HttpStatus.OK).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Import Guests from CSV (Direct) -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'import-guests',
    summary: 'Import guests from CSV file (direct import)',
  })
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', description: 'Wedding group UUID' })
  @RequirePermission('guests.create')
  @UseInterceptors(FileInterceptor('file'))
  @Post('/group/:groupUuid/import')
  async importGuests(
    @Param('groupUuid') groupUuid: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Res() res: Response,
    @Ip() ip: string,
  ) {
    try {
      if (!file) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      // Data-level filtering: Check ownership of wedding group
      const admin = (req as any).user;
      const filterAdminId = getDataFilterAdminId(admin);

      const result = await this.guestsService.importFromCsv(groupUuid, file.buffer.toString('utf-8'), filterAdminId);

      // Log activity for guest import
      await this.activityLogsService.logActivity({
        adminId: admin?.id,
        action: 'IMPORT',
        entityType: 'guest',
        entityId: groupUuid,
        entityName: `${result.imported || 0} Guest(s)`,
        description: `Imported ${result.imported || 0} guest(s) to wedding group`,
        ipAddress: ip,
        metadata: {
          wedding_group_uuid: groupUuid,
          guests_imported: result.imported || 0,
          skipped: result.skipped || 0,
        },
      });

      return res.status(HttpStatus.OK).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Send Broadcast -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'send-broadcast',
    summary: 'Send broadcast message to guests (email or SMS)',
  })
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', description: 'Wedding group UUID' })
  @RequirePermission('guests.send-invitation')
  @Post('/group/:groupUuid/broadcast')
  async sendBroadcast(
    @Param('groupUuid') groupUuid: string,
    @Body() dto: SendBroadcastDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Data-level filtering: Check ownership of wedding group
      const admin = (req as any).user;
      const filterAdminId = getDataFilterAdminId(admin);

      // Get wedding group details (with ownership check)
      const groupDetails = await this.guestsService.getWeddingGroupDetails(groupUuid, filterAdminId);
      if (!groupDetails) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: 'Wedding group not found or you do not have access',
        });
      }

      // Get guests based on audience
      const recipients = await this.guestsService.getGuestsForBroadcast(groupUuid, dto.audience);

      if (recipients.length === 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'No recipients found for the selected audience',
        });
      }

      // Send broadcast
      const result = await this.broadcastService.sendBroadcast({
        channel: dto.channel,
        audience: dto.audience,
        subject: dto.subject,
        message: dto.message,
        weddingGroupName: groupDetails.name,
        recipients,
      });

      return res.status(HttpStatus.OK).json({
        success: true,
        message: `Broadcast sent to ${result.successful} of ${result.total} recipients`,
        data: result,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }
}
