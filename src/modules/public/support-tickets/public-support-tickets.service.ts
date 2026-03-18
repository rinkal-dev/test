import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import {
  SupportTickets,
  TicketStatus,
  TicketPriority,
} from 'src/models/SupportTickets';
import { WeddingGroups } from 'src/models/WeddingGroups';
import { Bookings } from 'src/models/Bookings';
import { Guests } from 'src/models/Guests';
import {
  SUPPORT_TICKETS_REPOSITORY,
} from 'src/config/constants';
import { CreateGuestTicketDto } from './dto/CreateGuestTicketDto';
import { SupportTicketEmailService } from './support-ticket-email.service';

@Injectable()
export class PublicSupportTicketsService {
  private readonly logger = new Logger(PublicSupportTicketsService.name);

  constructor(
    @Inject(SUPPORT_TICKETS_REPOSITORY)
    private readonly ticketModel: typeof SupportTickets,
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
   * Create a support ticket from guest portal (public endpoint)
   */
  async createFromGuest(dto: CreateGuestTicketDto): Promise<SupportTickets> {
    let weddingGroupId: number | null = null;
    let bookingId: number | null = null;
    let guestId: number | null = null;

    // Try to find wedding group by slug
    if (dto.wedding_slug) {
      const group = await WeddingGroups.findOne({
        where: { slug: dto.wedding_slug },
      });
      if (group) {
        weddingGroupId = group.id;
      }
    }

    // Try to find booking by reference
    if (dto.booking_reference) {
      const booking = await Bookings.findOne({
        where: { booking_reference: dto.booking_reference },
        include: [
          {
            model: WeddingGroups,
            as: 'wedding_group',
            attributes: ['id'],
          },
        ],
      });
      if (booking) {
        bookingId = booking.id;
        // If we found a booking, also set the wedding group
        if (!weddingGroupId && booking.wedding_group) {
          weddingGroupId = booking.wedding_group.id;
        }
      }
    }

    // Try to find guest by email
    const guest = await Guests.findOne({
      where: { email: dto.guest_email },
    });
    if (guest) {
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
      priority: TicketPriority.MEDIUM, // Default priority for guest submissions
    });

    // Fetch the created ticket with associations for response and email
    const createdTicket = await this.ticketModel.findOne({
      where: { uuid: ticket.uuid },
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
      ],
    });

    // Send email notifications (async, don't block response)
    this.sendTicketEmails(createdTicket).catch((error) => {
      this.logger.error(`Failed to send ticket emails: ${error.message}`, error.stack);
    });

    return createdTicket;
  }

  /**
   * Send email notifications for a new ticket
   */
  private async sendTicketEmails(ticket: SupportTickets): Promise<void> {
    // Send acknowledgement to guest
    await this.emailService.sendGuestAcknowledgement(ticket);

    // Send notification to admin(s)
    await this.emailService.sendAdminNotification(ticket);
  }
}
