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
  Ip,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/decorators/require-permission.decorator';
import { getDataFilterAdminId, hasFullDataAccess } from 'src/helpers/data-ownership.helper';
import { SupportTicketsService } from './support-tickets.service';
import { CreateTicketDto, UpdateTicketDto, TicketQueryDto, CreateMessageDto, AssignTicketDto, ChangeStatusDto } from './dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@ApiTags('Support Tickets')
@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard, PermissionGuard)
@Controller({ version: '1', path: 'admin/support-tickets' })
export class SupportTicketsController {
  constructor(
    private readonly ticketsService: SupportTicketsService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  // ------------------------------------------------------------- Get All Tickets -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-tickets',
    summary: 'Get all support tickets with pagination and filters',
  })
  @ApiOkResponse({ description: 'List of tickets retrieved successfully' })
  @RequirePermission('support-tickets.view')
  @Get('/')
  async findAll(
    @Query() query: TicketQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const admin = (req as any).user;
      const filterAdminId = getDataFilterAdminId(admin);
      const currentAdminId = admin.id; // Pass current admin ID for "Assigned to Me" filter

      const result = await this.ticketsService.findAll(query, filterAdminId, currentAdminId);

      return res.status(HttpStatus.OK).json({
        success: true,
        data: {
          tickets: result.tickets.map((ticket) => this.formatTicketResponse(ticket)),
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            total_pages: result.totalPages,
          },
        },
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Get Ticket Stats -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-ticket-stats',
    summary: 'Get support ticket statistics',
  })
  @ApiOkResponse({ description: 'Ticket statistics retrieved successfully' })
  @RequirePermission('support-tickets.view')
  @Get('/stats')
  async getStats(@Req() req: Request, @Res() res: Response) {
    try {
      const admin = (req as any).user;
      const filterAdminId = getDataFilterAdminId(admin);
      const currentAdminId = admin.id; // Pass current admin ID for accurate "Assigned to Me" count

      const stats = await this.ticketsService.getStats(filterAdminId, currentAdminId);

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

  // ------------------------------------------------------------- Get Assignable Admins -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-assignable-admins',
    summary: 'Get all active admins for ticket assignment',
  })
  @ApiOkResponse({ description: 'List of assignable admins retrieved successfully' })
  @RequirePermission('support-tickets.view')
  @Get('/assignable-admins')
  async getAssignableAdmins(@Req() req: Request, @Res() res: Response) {
    try {
      const admin = (req as any).user;
      const hasFullAccess = hasFullDataAccess(admin);
      const admins = await this.ticketsService.getAssignableAdmins(admin.id, hasFullAccess);

      return res.status(HttpStatus.OK).json({
        success: true,
        data: admins,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Get Single Ticket -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-ticket',
    summary: 'Get a single support ticket by UUID',
  })
  @ApiOkResponse({ description: 'Ticket retrieved successfully' })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  @ApiParam({ name: 'uuid', description: 'Ticket UUID' })
  @RequirePermission('support-tickets.view')
  @Get('/:uuid')
  async findOne(
    @Param('uuid') uuid: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const ticket = await this.ticketsService.findByUuid(uuid);

      // Data-level filtering: Allow if owns group OR assigned to them
      const admin = (req as any).user;
      if (!this.hasTicketAccess(admin, ticket)) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: 'You do not have permission to view this ticket',
        });
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        data: this.formatTicketResponse(ticket, true),
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Create Ticket -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'create-ticket',
    summary: 'Create a new support ticket',
  })
  @ApiCreatedResponse({ description: 'Ticket created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @RequirePermission('support-tickets.create')
  @Post('/')
  async create(
    @Body() dto: CreateTicketDto,
    @Req() req: Request,
    @Res() res: Response,
    @Ip() ip: string,
  ) {
    try {
      const admin = (req as any).user;
      const filterAdminId = getDataFilterAdminId(admin);

      const ticket = await this.ticketsService.create(dto, filterAdminId);

      // Log activity
      await this.activityLogsService.logActivity({
        adminId: admin?.id,
        action: 'CREATE',
        entityType: 'support_ticket',
        entityId: ticket.uuid,
        entityName: ticket.ticket_number,
        description: `Created support ticket "${ticket.ticket_number}" - ${dto.subject}`,
        ipAddress: ip,
        metadata: {
          guest_name: dto.guest_name,
          guest_email: dto.guest_email,
          subject: dto.subject,
        },
      });

      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: 'Ticket created successfully',
        data: this.formatTicketResponse(ticket),
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Update Ticket -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'update-ticket',
    summary: 'Update a support ticket',
  })
  @ApiOkResponse({ description: 'Ticket updated successfully' })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  @ApiParam({ name: 'uuid', description: 'Ticket UUID' })
  @RequirePermission('support-tickets.edit')
  @Patch('/:uuid')
  async update(
    @Param('uuid') uuid: string,
    @Body() dto: UpdateTicketDto,
    @Req() req: Request,
    @Res() res: Response,
    @Ip() ip: string,
  ) {
    try {
      // Get existing ticket for ownership check
      const existingTicket = await this.ticketsService.findByUuid(uuid);

      // Data-level filtering: Allow if owns group OR assigned to them
      const admin = (req as any).user;
      if (!this.hasTicketAccess(admin, existingTicket)) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: 'You do not have permission to update this ticket',
        });
      }

      const ticket = await this.ticketsService.update(uuid, dto);

      // Log activity
      await this.activityLogsService.logActivity({
        adminId: admin?.id,
        action: 'UPDATE',
        entityType: 'support_ticket',
        entityId: uuid,
        entityName: ticket.ticket_number,
        description: `Updated support ticket "${ticket.ticket_number}"`,
        ipAddress: ip,
        metadata: { changes: Object.keys(dto) },
      });

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Ticket updated successfully',
        data: this.formatTicketResponse(ticket),
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Delete Ticket -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'delete-ticket',
    summary: 'Delete a support ticket',
  })
  @ApiOkResponse({ description: 'Ticket deleted successfully' })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  @ApiParam({ name: 'uuid', description: 'Ticket UUID' })
  @RequirePermission('support-tickets.delete')
  @Delete('/:uuid')
  async delete(
    @Param('uuid') uuid: string,
    @Req() req: Request,
    @Res() res: Response,
    @Ip() ip: string,
  ) {
    try {
      // Get existing ticket for ownership check
      const existingTicket = await this.ticketsService.findByUuid(uuid);

      // Data-level filtering: Allow if owns group OR assigned to them
      const admin = (req as any).user;
      if (!this.hasTicketAccess(admin, existingTicket)) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: 'You do not have permission to delete this ticket',
        });
      }

      await this.ticketsService.delete(uuid);

      // Log activity
      await this.activityLogsService.logActivity({
        adminId: admin?.id,
        action: 'DELETE',
        entityType: 'support_ticket',
        entityId: uuid,
        entityName: existingTicket.ticket_number,
        description: `Deleted support ticket "${existingTicket.ticket_number}"`,
        ipAddress: ip,
      });

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Ticket deleted successfully',
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Assign Ticket -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'assign-ticket',
    summary: 'Assign a support ticket to an admin',
  })
  @ApiOkResponse({ description: 'Ticket assigned successfully' })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  @ApiParam({ name: 'uuid', description: 'Ticket UUID' })
  @RequirePermission('support-tickets.assign')
  @Patch('/:uuid/assign')
  async assignTicket(
    @Param('uuid') uuid: string,
    @Body() dto: AssignTicketDto,
    @Req() req: Request,
    @Res() res: Response,
    @Ip() ip: string,
  ) {
    try {
      // Get existing ticket for ownership check
      const existingTicket = await this.ticketsService.findByUuid(uuid);

      // Data-level filtering: Allow if owns group OR assigned to them
      const admin = (req as any).user;
      if (!this.hasTicketAccess(admin, existingTicket)) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: 'You do not have permission to assign this ticket',
        });
      }

      const result = await this.ticketsService.assignTicket(uuid, dto.assigned_to_uuid || null);

      // Log activity
      await this.activityLogsService.logActivity({
        adminId: admin?.id,
        action: 'ASSIGN',
        entityType: 'support_ticket',
        entityId: uuid,
        entityName: existingTicket.ticket_number,
        description: result.assignedTo
          ? `Assigned ticket "${existingTicket.ticket_number}" to ${result.assignedTo.name}`
          : `Unassigned ticket "${existingTicket.ticket_number}"`,
        ipAddress: ip,
        metadata: { assigned_to: result.assignedTo },
      });

      return res.status(HttpStatus.OK).json({
        success: true,
        message: result.assignedTo ? 'Ticket assigned successfully' : 'Ticket unassigned successfully',
        data: this.formatTicketResponse(result.ticket),
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Change Ticket Status -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'change-ticket-status',
    summary: 'Change the status of a support ticket',
  })
  @ApiOkResponse({ description: 'Status changed successfully' })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  @ApiParam({ name: 'uuid', description: 'Ticket UUID' })
  @RequirePermission('support-tickets.edit')
  @Patch('/:uuid/status')
  async changeStatus(
    @Param('uuid') uuid: string,
    @Body() dto: ChangeStatusDto,
    @Req() req: Request,
    @Res() res: Response,
    @Ip() ip: string,
  ) {
    try {
      // Get existing ticket for ownership check
      const existingTicket = await this.ticketsService.findByUuid(uuid);

      // Data-level filtering: Allow if owns group OR assigned to them
      const admin = (req as any).user;
      if (!this.hasTicketAccess(admin, existingTicket)) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: 'You do not have permission to change this ticket status',
        });
      }

      const result = await this.ticketsService.changeStatus(uuid, dto.status);

      // Map status values to display names
      const statusDisplayNames: Record<string, string> = {
        open: 'Open',
        in_progress: 'In Progress',
        resolved: 'Resolved',
        closed: 'Closed',
      };

      // Log activity
      await this.activityLogsService.logActivity({
        adminId: admin?.id,
        action: 'STATUS_CHANGE',
        entityType: 'support_ticket',
        entityId: uuid,
        entityName: existingTicket.ticket_number,
        description: `Changed ticket "${existingTicket.ticket_number}" status from ${statusDisplayNames[result.previousStatus]} to ${statusDisplayNames[dto.status]}`,
        ipAddress: ip,
        metadata: {
          previous_status: result.previousStatus,
          new_status: dto.status,
        },
      });

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Status changed successfully',
        data: this.formatTicketResponse(result.ticket),
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Add Message/Reply -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'add-ticket-message',
    summary: 'Add a message/reply to a support ticket',
  })
  @ApiCreatedResponse({ description: 'Message added successfully' })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  @ApiParam({ name: 'uuid', description: 'Ticket UUID' })
  @RequirePermission('support-tickets.reply')
  @Post('/:uuid/messages')
  async addMessage(
    @Param('uuid') uuid: string,
    @Body() dto: CreateMessageDto,
    @Req() req: Request,
    @Res() res: Response,
    @Ip() ip: string,
  ) {
    try {
      // Get existing ticket for ownership check
      const existingTicket = await this.ticketsService.findByUuid(uuid);

      // Data-level filtering: Allow if owns group OR assigned to them
      const admin = (req as any).user;
      if (!this.hasTicketAccess(admin, existingTicket)) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: 'You do not have permission to reply to this ticket',
        });
      }

      const message = await this.ticketsService.addMessage(
        uuid,
        dto.message,
        admin.id,
        admin.name,
        dto.is_internal || false,
      );

      // Log activity
      await this.activityLogsService.logActivity({
        adminId: admin?.id,
        action: 'REPLY',
        entityType: 'support_ticket',
        entityId: uuid,
        entityName: existingTicket.ticket_number,
        description: `Added ${dto.is_internal ? 'internal note' : 'reply'} to ticket "${existingTicket.ticket_number}"`,
        ipAddress: ip,
        metadata: { is_internal: dto.is_internal || false },
      });

      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: 'Reply added successfully',
        data: this.formatMessageResponse(message),
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Get Ticket Messages -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-ticket-messages',
    summary: 'Get all messages for a support ticket',
  })
  @ApiOkResponse({ description: 'Messages retrieved successfully' })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  @ApiParam({ name: 'uuid', description: 'Ticket UUID' })
  @RequirePermission('support-tickets.view')
  @Get('/:uuid/messages')
  async getMessages(
    @Param('uuid') uuid: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Get existing ticket for ownership check
      const existingTicket = await this.ticketsService.findByUuid(uuid);

      // Data-level filtering: Allow if owns group OR assigned to them
      const admin = (req as any).user;
      if (!this.hasTicketAccess(admin, existingTicket)) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: 'You do not have permission to view this ticket',
        });
      }

      const messages = await this.ticketsService.getMessages(uuid, true);

      return res.status(HttpStatus.OK).json({
        success: true,
        data: messages.map((msg) => this.formatMessageResponse(msg)),
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Helper: Check Ticket Access -----------------------------------------------------------------------
  /**
   * Check if admin has access to the ticket
   * Access is granted if:
   * 1. Admin has full data access (Super Admin/Developer)
   * 2. Admin created the wedding group
   * 3. Ticket is assigned to the admin
   */
  private hasTicketAccess(admin: any, ticket: any): boolean {
    if (hasFullDataAccess(admin)) return true;
    if (ticket.wedding_group?.created_by === admin.id) return true;
    if (ticket.assigned_to === admin.id) return true;
    return false;
  }

  // ------------------------------------------------------------- Helper: Format Message Response -----------------------------------------------------------------------
  private formatMessageResponse(message: any) {
    return {
      uuid: message.uuid,
      author_name: message.author_name,
      message: message.message,
      is_internal: message.is_internal,
      is_from_guest: message.is_from_guest,
      created_at: message.created_at,
      admin: message.admin
        ? {
            uuid: message.admin.uuid,
            name: message.admin.name,
          }
        : null,
    };
  }

  // ------------------------------------------------------------- Helper: Format Ticket Response -----------------------------------------------------------------------
  private formatTicketResponse(ticket: any, includeMessages: boolean = false) {
    const response: any = {
      uuid: ticket.uuid,
      ticket_number: ticket.ticket_number,
      guest_name: ticket.guest_name,
      guest_email: ticket.guest_email,
      guest_phone: ticket.guest_phone,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status,
      priority: ticket.priority,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      resolved_at: ticket.resolved_at,
      closed_at: ticket.closed_at,
      wedding_group: ticket.wedding_group
        ? {
            uuid: ticket.wedding_group.uuid,
            name: ticket.wedding_group.name,
          }
        : null,
      booking: ticket.booking
        ? {
            uuid: ticket.booking.uuid,
            booking_reference: ticket.booking.booking_reference,
          }
        : null,
      assigned_admin: ticket.assigned_admin
        ? {
            uuid: ticket.assigned_admin.uuid,
            name: ticket.assigned_admin.name,
            email: ticket.assigned_admin.email,
          }
        : null,
    };

    if (includeMessages && ticket.messages) {
      response.messages = ticket.messages.map((msg: any) => ({
        uuid: msg.uuid,
        author_name: msg.author_name,
        message: msg.message,
        is_internal: msg.is_internal,
        is_from_guest: msg.is_from_guest,
        created_at: msg.created_at,
        admin: msg.admin
          ? {
              uuid: msg.admin.uuid,
              name: msg.admin.name,
            }
          : null,
      }));
    }

    return response;
  }
}
