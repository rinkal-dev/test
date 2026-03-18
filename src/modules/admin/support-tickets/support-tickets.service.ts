import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import {
  SupportTickets,
  TicketStatus,
  TicketPriority,
} from 'src/models/SupportTickets';
import { TicketMessages } from 'src/models/TicketMessages';
import { WeddingGroups } from 'src/models/WeddingGroups';
import { Bookings } from 'src/models/Bookings';
import { Guests } from 'src/models/Guests';
import { Admins } from 'src/models/Admins';
import {
  SUPPORT_TICKETS_REPOSITORY,
  TICKET_MESSAGES_REPOSITORY,
} from 'src/config/constants';
import { CreateTicketDto, UpdateTicketDto, TicketQueryDto, TicketFilterType } from './dto';
import { SupportTicketEmailService } from 'src/modules/public/support-tickets/support-ticket-email.service';

@Injectable()
export class SupportTicketsService {
  private readonly logger = new Logger(SupportTicketsService.name);

  constructor(
    @Inject(SUPPORT_TICKETS_REPOSITORY)
    private readonly ticketModel: typeof SupportTickets,
    @Inject(TICKET_MESSAGES_REPOSITORY)
    private readonly messageModel: typeof TicketMessages,
    private readonly emailService: SupportTicketEmailService,
  ) {}

  /**
   * Generate a unique ticket number
   */
  private async generateTicketNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `TKT-${year}-`;

    // Find the latest ticket number for this year
    const latestTicket = await this.ticketModel.findOne({
      where: {
        ticket_number: {
          [Op.like]: `${prefix}%`,
        },
      },
      order: [['id', 'DESC']],
    });

    let nextNumber = 1;
    if (latestTicket) {
      const lastNumber = parseInt(latestTicket.ticket_number.split('-').pop() || '0', 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Create a new support ticket
   */
  async create(dto: CreateTicketDto, filterAdminId?: number | null): Promise<SupportTickets> {
    // Resolve IDs from UUIDs if provided
    let weddingGroupId: number | null = null;
    let bookingId: number | null = null;
    let guestId: number | null = null;

    if (dto.wedding_group_uuid) {
      const group = await WeddingGroups.findOne({
        where: { uuid: dto.wedding_group_uuid },
      });
      if (!group) {
        throw new BadRequestException('Wedding group not found');
      }
      // Check ownership if filtering is enabled
      if (filterAdminId !== null && filterAdminId !== undefined && group.created_by !== filterAdminId) {
        throw new BadRequestException('You do not have access to this wedding group');
      }
      weddingGroupId = group.id;
    }

    if (dto.booking_uuid) {
      const booking = await Bookings.findOne({
        where: { uuid: dto.booking_uuid },
      });
      if (!booking) {
        throw new BadRequestException('Booking not found');
      }
      bookingId = booking.id;
    }

    if (dto.guest_uuid) {
      const guest = await Guests.findOne({
        where: { uuid: dto.guest_uuid },
      });
      if (!guest) {
        throw new BadRequestException('Guest not found');
      }
      guestId = guest.id;
    }

    const ticketNumber = await this.generateTicketNumber();

    const ticket = await this.ticketModel.create({
      uuid: uuidv4(),
      ticket_number: ticketNumber,
      wedding_group_id: weddingGroupId,
      booking_id: bookingId,
      guest_id: guestId,
      guest_name: dto.guest_name,
      guest_email: dto.guest_email,
      guest_phone: dto.guest_phone || null,
      subject: dto.subject,
      message: dto.message,
      status: TicketStatus.OPEN,
      priority: dto.priority || TicketPriority.MEDIUM,
    });

    return this.findByUuid(ticket.uuid);
  }

  /**
   * Get all tickets with filtering and pagination
   * @param query - Query parameters for filtering
   * @param filterAdminId - Admin ID for data-level filtering (null = full access)
   * @param currentAdminId - Current admin's ID (for "Assigned to Me" filter, works for all admins)
   */
  async findAll(
    query: TicketQueryDto,
    filterAdminId?: number | null,
    currentAdminId?: number,
  ): Promise<{
    tickets: SupportTickets[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const where: any = {};
    const filterType = query.filter_type || TicketFilterType.ALL;

    // Handle "Assigned to Me" filter - works for ALL admins including Super Admin
    if (filterType === TicketFilterType.ASSIGNED_TO_ME && currentAdminId) {
      where.assigned_to = currentAdminId;
    }
    // Data-level filtering for sub-admins (not "Assigned to Me")
    else if (filterAdminId !== null && filterAdminId !== undefined) {
      // Get wedding groups created by this admin
      const adminGroups = await WeddingGroups.findAll({
        where: { created_by: filterAdminId },
        attributes: ['id'],
      });
      const groupIds = adminGroups.map((g) => g.id);

      // ALL: Tickets from my groups OR assigned to me
      where[Op.or] = [
        { wedding_group_id: { [Op.in]: groupIds } },
        { assigned_to: filterAdminId },
      ];
    }
    // Super Admin with "All Tickets" - no data-level filter needed

    // Status filter
    if (query.status) {
      where.status = query.status;
    }

    // Priority filter
    if (query.priority) {
      where.priority = query.priority;
    }

    // Wedding group filter
    if (query.wedding_group_uuid) {
      const group = await WeddingGroups.findOne({
        where: { uuid: query.wedding_group_uuid },
      });
      if (group) {
        where.wedding_group_id = group.id;
      }
    }

    // Assigned admin filter
    if (query.assigned_to_uuid) {
      const admin = await Admins.findOne({
        where: { uuid: query.assigned_to_uuid },
      });
      if (admin) {
        where.assigned_to = admin.id;
      }
    }

    // Search filter
    if (query.search) {
      where[Op.or] = [
        { guest_name: { [Op.iLike]: `%${query.search}%` } },
        { guest_email: { [Op.iLike]: `%${query.search}%` } },
        { subject: { [Op.iLike]: `%${query.search}%` } },
        { ticket_number: { [Op.iLike]: `%${query.search}%` } },
      ];
    }

    const { rows: tickets, count: total } = await this.ticketModel.findAndCountAll({
      where,
      include: [
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: ['uuid', 'name'],
        },
        {
          model: Bookings,
          as: 'booking',
          attributes: ['uuid', 'booking_reference'],
        },
        {
          model: Admins,
          as: 'assigned_admin',
          attributes: ['uuid', 'name', 'email'],
        },
      ],
      order: [[query.sort_by || 'created_at', query.sort_order || 'DESC']],
      limit,
      offset,
    });

    return {
      tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single ticket by UUID
   */
  async findByUuid(uuid: string): Promise<SupportTickets> {
    const ticket = await this.ticketModel.findOne({
      where: { uuid },
      include: [
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: ['uuid', 'name', 'created_by'],
        },
        {
          model: Bookings,
          as: 'booking',
          attributes: ['uuid', 'booking_reference'],
        },
        {
          model: Guests,
          as: 'guest',
          attributes: ['uuid', 'name', 'email'],
        },
        {
          model: Admins,
          as: 'assigned_admin',
          attributes: ['uuid', 'name', 'email'],
        },
        {
          model: TicketMessages,
          as: 'messages',
          include: [
            {
              model: Admins,
              as: 'admin',
              attributes: ['uuid', 'name'],
            },
          ],
          order: [['created_at', 'ASC']],
        },
      ],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  /**
   * Update a ticket
   */
  async update(uuid: string, dto: UpdateTicketDto): Promise<SupportTickets> {
    const ticket = await this.ticketModel.findOne({ where: { uuid } });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const updateData: any = {};

    if (dto.status) {
      updateData.status = dto.status;

      // Set resolved/closed timestamps
      if (dto.status === TicketStatus.RESOLVED && !ticket.resolved_at) {
        updateData.resolved_at = new Date();
      }
      if (dto.status === TicketStatus.CLOSED && !ticket.closed_at) {
        updateData.closed_at = new Date();
      }
    }

    if (dto.priority) {
      updateData.priority = dto.priority;
    }

    if (dto.subject) {
      updateData.subject = dto.subject;
    }

    // Handle assignment
    if (dto.assigned_to_uuid !== undefined) {
      if (dto.assigned_to_uuid === null) {
        updateData.assigned_to = null;
      } else {
        const admin = await Admins.findOne({
          where: { uuid: dto.assigned_to_uuid },
        });
        if (!admin) {
          throw new BadRequestException('Admin not found');
        }
        updateData.assigned_to = admin.id;
      }
    }

    await ticket.update(updateData);

    return this.findByUuid(uuid);
  }

  /**
   * Delete a ticket
   */
  async delete(uuid: string): Promise<void> {
    const ticket = await this.ticketModel.findOne({ where: { uuid } });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Delete associated messages first (CASCADE should handle this, but being explicit)
    await this.messageModel.destroy({
      where: { ticket_id: ticket.id },
    });

    await ticket.destroy();
  }

  /**
   * Get ticket statistics
   * Returns stats for all tickets accessible to the admin (my groups + assigned to me)
   * @param filterAdminId - Admin ID for data-level filtering (null = full access)
   * @param currentAdminId - Current admin's ID (for accurate "assigned_to_me" count)
   */
  async getStats(filterAdminId?: number | null, currentAdminId?: number): Promise<{
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
    assigned_to_me: number;
    unassigned: number;
    by_priority: { low: number; medium: number; high: number; urgent: number };
  }> {
    let whereBase: any = {};

    // Data-level filtering: Sub-admins see tickets from their groups OR assigned to them
    if (filterAdminId !== null && filterAdminId !== undefined) {
      const adminGroups = await WeddingGroups.findAll({
        where: { created_by: filterAdminId },
        attributes: ['id'],
      });
      const groupIds = adminGroups.map((g) => g.id);

      // ALL: Tickets from my groups OR assigned to me
      whereBase[Op.or] = [
        { wedding_group_id: { [Op.in]: groupIds } },
        { assigned_to: filterAdminId },
      ];
    }

    const [total, open, inProgress, resolved, closed, assignedToMe, unassigned, low, medium, high, urgent] =
      await Promise.all([
        this.ticketModel.count({ where: whereBase }),
        this.ticketModel.count({ where: { ...whereBase, status: TicketStatus.OPEN } }),
        this.ticketModel.count({ where: { ...whereBase, status: TicketStatus.IN_PROGRESS } }),
        this.ticketModel.count({ where: { ...whereBase, status: TicketStatus.RESOLVED } }),
        this.ticketModel.count({ where: { ...whereBase, status: TicketStatus.CLOSED } }),
        // Assigned to current admin - always use currentAdminId if available
        currentAdminId
          ? this.ticketModel.count({ where: { ...whereBase, assigned_to: currentAdminId } })
          : 0,
        // Unassigned tickets (within accessible tickets)
        this.ticketModel.count({ where: { ...whereBase, assigned_to: null } }),
        this.ticketModel.count({ where: { ...whereBase, priority: TicketPriority.LOW } }),
        this.ticketModel.count({ where: { ...whereBase, priority: TicketPriority.MEDIUM } }),
        this.ticketModel.count({ where: { ...whereBase, priority: TicketPriority.HIGH } }),
        this.ticketModel.count({ where: { ...whereBase, priority: TicketPriority.URGENT } }),
      ]);

    return {
      total,
      open,
      in_progress: inProgress,
      resolved,
      closed,
      assigned_to_me: assignedToMe,
      unassigned,
      by_priority: { low, medium, high, urgent },
    };
  }

  /**
   * Add a message/reply to a ticket
   */
  async addMessage(
    ticketUuid: string,
    message: string,
    adminId: number,
    adminName: string,
    isInternal: boolean = false,
  ): Promise<TicketMessages> {
    const ticket = await this.ticketModel.findOne({
      where: { uuid: ticketUuid },
      include: [
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: ['uuid', 'name'],
        },
      ],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const newMessage = await this.messageModel.create({
      uuid: uuidv4(),
      ticket_id: ticket.id,
      admin_id: adminId,
      author_name: adminName,
      message,
      is_internal: isInternal,
      is_from_guest: false,
    });

    // If ticket is open and admin replies, change to in_progress
    if (ticket.status === TicketStatus.OPEN && !isInternal) {
      await ticket.update({ status: TicketStatus.IN_PROGRESS });
    }

    // Send email notification to guest for non-internal replies
    if (!isInternal && ticket.guest_email) {
      this.emailService.sendGuestReplyNotification(ticket, message, adminName).catch((error) => {
        this.logger.error(`Failed to send reply notification: ${error.message}`, error.stack);
      });
    }

    return this.messageModel.findOne({
      where: { uuid: newMessage.uuid },
      include: [
        {
          model: Admins,
          as: 'admin',
          attributes: ['uuid', 'name'],
        },
      ],
    });
  }

  /**
   * Get all messages for a ticket
   */
  async getMessages(
    ticketUuid: string,
    includeInternal: boolean = true,
  ): Promise<TicketMessages[]> {
    const ticket = await this.ticketModel.findOne({ where: { uuid: ticketUuid } });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const where: any = { ticket_id: ticket.id };
    if (!includeInternal) {
      where.is_internal = false;
    }

    return this.messageModel.findAll({
      where,
      include: [
        {
          model: Admins,
          as: 'admin',
          attributes: ['uuid', 'name'],
        },
      ],
      order: [['created_at', 'ASC']],
    });
  }

  /**
   * Assign a ticket to an admin
   */
  async assignTicket(
    ticketUuid: string,
    adminUuid: string | null,
  ): Promise<{ ticket: SupportTickets; assignedTo: any }> {
    const ticket = await this.ticketModel.findOne({ where: { uuid: ticketUuid } });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    let assignedAdmin: any = null;
    let assignedToId: number | null = null;

    if (adminUuid) {
      assignedAdmin = await Admins.findOne({
        where: { uuid: adminUuid },
        attributes: ['id', 'uuid', 'name', 'email'],
      });
      if (!assignedAdmin) {
        throw new BadRequestException('Admin not found');
      }
      assignedToId = assignedAdmin.id;
    }

    await ticket.update({ assigned_to: assignedToId });

    return {
      ticket: await this.findByUuid(ticketUuid),
      assignedTo: assignedAdmin
        ? { uuid: assignedAdmin.uuid, name: assignedAdmin.name, email: assignedAdmin.email }
        : null,
    };
  }

  /**
   * Get assignable admins for ticket assignment dropdown
   * Hierarchical filtering:
   * - Super Admin/Developer (full access): Can see all admins (except Developer role)
   * - Sub-admins: Can only see themselves + admins they created (subordinates)
   */
  async getAssignableAdmins(
    currentAdminId: number,
    hasFullAccess: boolean,
  ): Promise<{ uuid: string; name: string; email: string }[]> {
    // Build where clause based on access level
    const whereClause: any = { is_active: true };

    if (!hasFullAccess) {
      // Sub-admins can only see themselves + admins they created
      whereClause[Op.or] = [
        { id: currentAdminId }, // Include themselves
        { created_by: currentAdminId }, // Include admins they created (subordinates)
      ];
    }

    // Get admins with their roles
    const admins = await Admins.findAll({
      where: whereClause,
      attributes: ['id', 'uuid', 'name', 'email'],
      include: [
        {
          association: 'roles',
          attributes: ['name'],
          through: { attributes: [] },
        },
      ],
      order: [['name', 'ASC']],
    });

    // Filter out admins who have the Developer role
    const assignableAdmins = admins.filter((admin) => {
      const roleNames = admin.roles?.map((role: any) => role.name) || [];
      return !roleNames.includes('Developer');
    });

    // Remove duplicates by email (same person may have multiple records with different UUIDs)
    const uniqueAdmins = new Map<string, { uuid: string; name: string; email: string }>();

    for (const admin of assignableAdmins) {
      const emailLower = admin.email.toLowerCase();
      if (!uniqueAdmins.has(emailLower)) {
        uniqueAdmins.set(emailLower, {
          uuid: admin.uuid,
          name: admin.name,
          email: admin.email,
        });
      }
    }

    return Array.from(uniqueAdmins.values());
  }

  /**
   * Change ticket status
   */
  async changeStatus(
    ticketUuid: string,
    newStatus: TicketStatus,
  ): Promise<{ ticket: SupportTickets; previousStatus: TicketStatus }> {
    const ticket = await this.ticketModel.findOne({ where: { uuid: ticketUuid } });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const previousStatus = ticket.status;
    const updateData: any = { status: newStatus };

    // Set resolved/closed timestamps
    if (newStatus === TicketStatus.RESOLVED && !ticket.resolved_at) {
      updateData.resolved_at = new Date();
    }
    if (newStatus === TicketStatus.CLOSED && !ticket.closed_at) {
      updateData.closed_at = new Date();
    }

    // Clear resolved_at if reopening
    if (newStatus === TicketStatus.OPEN || newStatus === TicketStatus.IN_PROGRESS) {
      if (ticket.resolved_at && !ticket.closed_at) {
        updateData.resolved_at = null;
      }
    }

    await ticket.update(updateData);

    return {
      ticket: await this.findByUuid(ticketUuid),
      previousStatus,
    };
  }
}
