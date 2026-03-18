/**
 * ============================================
 * GUEST INVITATION EMAIL SERVICE
 * ============================================
 *
 * Service for sending wedding invitation emails to guests.
 * Supports single and bulk invitation sending with async processing.
 */

import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { getEnvironmentData } from '../../../helpers/general';

export interface GuestInvitationData {
  // Guest Info
  guestUuid: string;
  guestName: string;
  guestEmail: string;
  guestAccessToken: string;
  plusOnesAllowed: number;
  hasPassword?: boolean;
  setPasswordToken?: string | null;

  // Wedding Info
  weddingName: string;
  brideName: string;
  groomName: string;
  eventStartDate: string;
  eventEndDate: string;
  welcomeMessage?: string;
  bookingLink: string;

  // Hotel Info
  hotelName: string;
  hotelCity: string;
  hotelCountry: string;

  // Optional
  customMessage?: string;
}

export interface InvitationResult {
  guestUuid: string;
  guestEmail: string;
  success: boolean;
  message: string;
}

export interface BulkInvitationResult {
  total: number;
  successful: number;
  failed: number;
  results: InvitationResult[];
}

@Injectable()
export class GuestInvitationEmailService {
  private readonly logger = new Logger(GuestInvitationEmailService.name);

  constructor(private readonly mailerService: MailerService) {}

  /**
   * Send invitation email to a single guest
   */
  async sendInvitation(data: GuestInvitationData): Promise<InvitationResult> {
    const appName = getEnvironmentData('APP_NAME') || 'DestaPay';
    const frontendUrl = getEnvironmentData('FRONTEND_URL') || getEnvironmentData('APP_URL') || '';

    // Build booking URL (public page - guest identifies via email)
    const bookingUrl = `${frontendUrl}/wedding/${data.bookingLink}`;
    const myBookingUrl = `${frontendUrl}/my-booking`;

    // Set password URL (only if guest doesn't have password and token is provided)
    const setPasswordUrl = !data.hasPassword && data.setPasswordToken
      ? `${frontendUrl}/my-booking/set-password?token=${data.setPasswordToken}&email=${encodeURIComponent(data.guestEmail)}`
      : null;

    // Build email context
    const logoUrl = getEnvironmentData('APP_LOGO_URL') || '';
    const context = {
      appName,
      logoUrl,
      currentYear: new Date().getFullYear(),

      // Guest
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      plusOnesAllowed: data.plusOnesAllowed,

      // Wedding
      weddingName: data.weddingName,
      brideName: data.brideName,
      groomName: data.groomName,
      eventStartDate: this.formatDate(data.eventStartDate),
      eventEndDate: this.formatDate(data.eventEndDate),
      welcomeMessage: data.welcomeMessage,

      // Hotel
      hotelName: data.hotelName,
      hotelLocation: `${data.hotelCity}, ${data.hotelCountry}`,

      // URLs
      bookingUrl,
      myBookingUrl,
      setPasswordUrl,

      // Password setup
      hasPassword: data.hasPassword || false,

      // Custom message from admin
      customMessage: data.customMessage,
    };

    const subject = `You're Invited! ${data.brideName} & ${data.groomName}'s Wedding`;

    try {
      await this.mailerService.sendMail({
        to: data.guestEmail,
        subject,
        template: 'guest-invitation',
        context,
      });

      this.logger.log(`Invitation email sent to ${data.guestEmail} for ${data.weddingName}`);

      return {
        guestUuid: data.guestUuid,
        guestEmail: data.guestEmail,
        success: true,
        message: 'Invitation sent successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to send invitation to ${data.guestEmail}: ${error.message}`, error.stack);

      return {
        guestUuid: data.guestUuid,
        guestEmail: data.guestEmail,
        success: false,
        message: `Failed to send: ${error.message}`,
      };
    }
  }

  /**
   * Send bulk invitations asynchronously
   * Processes emails one by one to avoid overwhelming the SMTP server
   */
  async sendBulkInvitations(
    invitations: GuestInvitationData[],
    delayMs: number = 100,
  ): Promise<BulkInvitationResult> {
    const results: InvitationResult[] = [];
    let successful = 0;
    let failed = 0;

    this.logger.log(`Starting bulk invitation send for ${invitations.length} guests`);

    for (const invitation of invitations) {
      const result = await this.sendInvitation(invitation);
      results.push(result);

      if (result.success) {
        successful++;
      } else {
        failed++;
      }

      // Small delay between emails to avoid rate limiting
      if (delayMs > 0 && invitations.indexOf(invitation) < invitations.length - 1) {
        await this.delay(delayMs);
      }
    }

    this.logger.log(`Bulk invitation complete: ${successful} sent, ${failed} failed`);

    return {
      total: invitations.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Format date for display
   * Handles date-only strings (YYYY-MM-DD) without timezone conversion
   */
  private formatDate(date: Date | string | null): string {
    if (!date) return 'TBD';

    // If it's a date-only string (YYYY-MM-DD), parse it without timezone shift
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    // For full ISO timestamps, use UTC to avoid timezone issues
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
