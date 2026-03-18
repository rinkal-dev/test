/**
 * ============================================
 * SUPPORT TICKET EMAIL SERVICE
 * ============================================
 *
 * Service for sending support ticket-related emails.
 * - Acknowledgement email to guest when ticket is submitted
 * - Notification email to admin(s) when new ticket is created
 * - Notification email to guest when admin replies
 */

import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { getEnvironmentData } from 'src/helpers/general';
import { SupportTickets } from 'src/models/SupportTickets';
import { WeddingGroups } from 'src/models/WeddingGroups';
import { Admins } from 'src/models';
import { ADMINS_REPOSITORY } from 'src/config/constants';
import { Op } from 'sequelize';

@Injectable()
export class SupportTicketEmailService {
  private readonly logger = new Logger(SupportTicketEmailService.name);

  constructor(
    private readonly mailerService: MailerService,
    @Inject(ADMINS_REPOSITORY) private adminsRepository: typeof Admins,
  ) {}

  /**
   * Send acknowledgement email to guest when ticket is submitted
   */
  async sendGuestAcknowledgement(ticket: SupportTickets): Promise<boolean> {
    const appName = getEnvironmentData('APP_NAME') || 'DestaPay';
    const logoUrl = getEnvironmentData('APP_LOGO_URL') || '';
    const frontendUrl = getEnvironmentData('FRONTEND_URL') || getEnvironmentData('APP_URL') || '';

    const context = {
      appName,
      logoUrl,
      currentYear: new Date().getFullYear(),

      // Ticket details
      ticketNumber: ticket.ticket_number,
      guestName: ticket.guest_name,
      subject: ticket.subject,
      message: ticket.message,

      // Wedding group (if linked)
      weddingName: ticket.wedding_group?.name || null,

      // Support URL (guest portal)
      supportUrl: `${frontendUrl}/my-booking`,
    };

    try {
      await this.mailerService.sendMail({
        to: ticket.guest_email,
        subject: `Support Ticket Received - ${ticket.ticket_number} | ${appName}`,
        template: 'support-ticket-acknowledgement',
        context,
      });

      this.logger.log(`Support ticket acknowledgement sent to ${ticket.guest_email} for ${ticket.ticket_number}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send ticket acknowledgement: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Send notification email to admin(s) when new ticket is created
   */
  async sendAdminNotification(ticket: SupportTickets): Promise<boolean> {
    const appName = getEnvironmentData('APP_NAME') || 'DestaPay';
    const logoUrl = getEnvironmentData('APP_LOGO_URL') || '';
    const adminUrl = getEnvironmentData('ADMIN_URL') || getEnvironmentData('FRONTEND_URL') || '';

    // Find admin(s) to notify
    let adminEmails: string[] = [];

    // If ticket is linked to a wedding group, notify the group creator
    if (ticket.wedding_group_id) {
      const weddingGroup = await WeddingGroups.findByPk(ticket.wedding_group_id, {
        include: [
          {
            model: Admins,
            as: 'created_by_admin',
            attributes: ['email', 'name'],
          },
        ],
      });

      if (weddingGroup?.created_by_admin?.email) {
        adminEmails.push(weddingGroup.created_by_admin.email);
      }
    }

    // Also notify super admins (users with full data access)
    const superAdmins = await this.adminsRepository.findAll({
      where: {
        is_active: true,
        data_access_level: 'full',
      },
      attributes: ['email'],
      limit: 5, // Limit to avoid spamming too many admins
    });

    superAdmins.forEach((admin) => {
      if (admin.email && !adminEmails.includes(admin.email)) {
        adminEmails.push(admin.email);
      }
    });

    if (adminEmails.length === 0) {
      this.logger.warn(`No admin emails found to notify for ticket ${ticket.ticket_number}`);
      return false;
    }

    const context = {
      appName,
      logoUrl,
      currentYear: new Date().getFullYear(),

      // Ticket details
      ticketNumber: ticket.ticket_number,
      guestName: ticket.guest_name,
      guestEmail: ticket.guest_email,
      guestPhone: ticket.guest_phone || 'Not provided',
      subject: ticket.subject,
      message: ticket.message,
      priority: ticket.priority,
      status: ticket.status,

      // Wedding group (if linked)
      weddingName: ticket.wedding_group?.name || 'Not linked',

      // Booking reference (if linked)
      bookingReference: ticket.booking?.booking_reference || 'Not linked',

      // Admin URL to view ticket
      viewTicketUrl: `${adminUrl}/admin/support-tickets`,

      // Timestamp
      createdAt: this.formatDateTime(ticket.created_at),
    };

    try {
      // Send to all admin emails
      await this.mailerService.sendMail({
        to: adminEmails,
        subject: `New Support Ticket - ${ticket.ticket_number} | ${ticket.subject}`,
        template: 'support-ticket-new-admin',
        context,
      });

      this.logger.log(`Admin notification sent to ${adminEmails.join(', ')} for ${ticket.ticket_number}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send admin notification: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Send notification email to guest when admin replies
   */
  async sendGuestReplyNotification(
    ticket: SupportTickets,
    replyMessage: string,
    adminName: string,
  ): Promise<boolean> {
    const appName = getEnvironmentData('APP_NAME') || 'DestaPay';
    const logoUrl = getEnvironmentData('APP_LOGO_URL') || '';
    const frontendUrl = getEnvironmentData('FRONTEND_URL') || getEnvironmentData('APP_URL') || '';

    const context = {
      appName,
      logoUrl,
      currentYear: new Date().getFullYear(),

      // Ticket details
      ticketNumber: ticket.ticket_number,
      guestName: ticket.guest_name,
      subject: ticket.subject,

      // Reply details
      replyMessage,
      adminName,
      repliedAt: this.formatDateTime(new Date()),

      // Support URL
      supportUrl: `${frontendUrl}/my-booking`,
    };

    try {
      await this.mailerService.sendMail({
        to: ticket.guest_email,
        subject: `Reply to Your Support Ticket - ${ticket.ticket_number} | ${appName}`,
        template: 'support-ticket-reply',
        context,
      });

      this.logger.log(`Reply notification sent to ${ticket.guest_email} for ${ticket.ticket_number}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send reply notification: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Format date/time for display
   */
  private formatDateTime(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}
