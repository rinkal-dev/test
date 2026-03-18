/**
 * ============================================
 * FLIGHT CHANGE NOTIFICATION SERVICE
 * ============================================
 *
 * Service for sending notifications to admin when guest
 * updates their flight details (especially when transfer
 * status needs to be re-confirmed).
 */

import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { getEnvironmentData } from '../../../helpers/general';

export interface FlightChangeData {
  flightUuid: string;
  bookingUuid: string;
  guestName: string;
  guestEmail: string;
  bookingReference: string;
  weddingGroupName: string;
  changes: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  arrivalStatusReset: boolean;
  departureStatusReset: boolean;
  previousArrivalStatus?: string;
  previousDepartureStatus?: string;
  isUrgent?: boolean; // FL-LOCK: True if change made within 24-48 hours of travel
}

@Injectable()
export class FlightChangeNotificationService {
  private readonly logger = new Logger(FlightChangeNotificationService.name);

  constructor(private readonly mailerService: MailerService) {}

  /**
   * Notify admin when guest updates their flight details
   */
  async notifyAdminOfFlightChange(data: FlightChangeData): Promise<{ success: boolean; message: string }> {
    const appName = getEnvironmentData('APP_NAME') || 'DestaPay';
    const adminEmail = getEnvironmentData('ADMIN_NOTIFICATION_EMAIL') || getEnvironmentData('MAIL_FROM_ADDRESS');
    const frontendUrl = getEnvironmentData('FRONTEND_URL') || getEnvironmentData('APP_URL') || '';

    if (!adminEmail) {
      this.logger.warn('No admin email configured for flight change notifications');
      return { success: false, message: 'No admin email configured' };
    }

    // Build admin flights page URL
    const adminFlightsUrl = `${frontendUrl}/admin/flights`;

    // Format field names for display
    const formatFieldName = (field: string): string => {
      return field
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
    };

    // Format changes for display
    const formattedChanges = data.changes.map((change) => ({
      field: formatFieldName(change.field),
      oldValue: change.oldValue || '(empty)',
      newValue: change.newValue || '(empty)',
    }));

    // Build priority indicator
    // FL-LOCK: Include urgent flag if change made within warning period (24-48 hours)
    const isUrgent = data.isUrgent || data.arrivalStatusReset || data.departureStatusReset;
    const priorityLabel = data.isUrgent ? 'URGENT - TRAVEL IMMINENT' : (isUrgent ? 'ACTION REQUIRED' : 'Info');

    // Build status reset summary
    const statusResets: string[] = [];
    if (data.arrivalStatusReset) {
      statusResets.push(`Arrival: ${data.previousArrivalStatus || 'confirmed'} → pending`);
    }
    if (data.departureStatusReset) {
      statusResets.push(`Departure: ${data.previousDepartureStatus || 'confirmed'} → pending`);
    }

    const logoUrl = getEnvironmentData('APP_LOGO_URL') || '';
    const context = {
      appName,
      logoUrl,
      currentYear: new Date().getFullYear(),
      priorityLabel,
      isUrgent,

      // Guest & Booking Info
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      bookingReference: data.bookingReference,
      weddingGroupName: data.weddingGroupName,

      // Changes
      changes: formattedChanges,
      hasChanges: formattedChanges.length > 0,

      // Status Resets
      statusResets,
      hasStatusResets: statusResets.length > 0,
      arrivalStatusReset: data.arrivalStatusReset,
      departureStatusReset: data.departureStatusReset,

      // URLs
      adminFlightsUrl,

      // Timestamp
      changedAt: new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      }),
    };

    // FL-LOCK: Update subject line based on urgency level
    let subject: string;
    if (data.isUrgent) {
      subject = `[URGENT - TRAVEL IMMINENT] Flight Details Changed - ${data.guestName} (${data.bookingReference})`;
    } else if (isUrgent) {
      subject = `[ACTION REQUIRED] Flight Details Changed - ${data.guestName} (${data.bookingReference})`;
    } else {
      subject = `Flight Details Updated - ${data.guestName} (${data.bookingReference})`;
    }

    try {
      await this.mailerService.sendMail({
        to: adminEmail,
        subject,
        template: 'flight-change-notification',
        context,
      });

      this.logger.log(`Flight change notification sent to ${adminEmail} for booking ${data.bookingReference}`);

      return {
        success: true,
        message: `Notification sent to ${adminEmail}`,
      };
    } catch (error) {
      this.logger.error(`Failed to send flight change notification: ${error.message}`, error.stack);

      return {
        success: false,
        message: `Failed to send email: ${error.message}`,
      };
    }
  }
}
