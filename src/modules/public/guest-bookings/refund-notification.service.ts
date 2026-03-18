/**
 * ============================================
 * REFUND NOTIFICATION SERVICE
 * ============================================
 *
 * Service for sending refund-related notifications
 * to both admins and guests.
 */

import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { getEnvironmentData } from 'src/helpers/general';

interface AdminRefundNotificationData {
  guestName: string;
  guestEmail: string;
  bookingReference: string;
  weddingName: string;
  refundAmount: string;
  refundPercentage: number;
  reason: string;
}

interface GuestRefundNotificationData {
  guestName: string;
  guestEmail: string;
  bookingReference: string;
  weddingName: string;
  refundAmount: string;
  status: 'pending' | 'approved' | 'denied' | 'processed';
  denialReason?: string;
}

@Injectable()
export class RefundNotificationService {
  private readonly logger = new Logger(RefundNotificationService.name);

  constructor(private readonly mailService: MailerService) {}

  /**
   * Get common email context with branding
   */
  private getCommonContext() {
    return {
      appName: getEnvironmentData('APP_NAME') || 'DestaPay',
      logoUrl: getEnvironmentData('APP_LOGO_URL') || '',
      currentYear: new Date().getFullYear(),
    };
  }

  /**
   * Send notification to admin when a guest requests a refund
   */
  async notifyAdminOfRefundRequest(data: AdminRefundNotificationData): Promise<void> {
    try {
      const adminEmail = getEnvironmentData('ADMIN_NOTIFICATION_EMAIL') ||
                         getEnvironmentData('MAIL_FROM_ADDRESS');

      const adminUrl = `${getEnvironmentData('ADMIN_PANEL_URL') || getEnvironmentData('FRONTEND_URL')}/admin/payments?tab=refunds`;

      await this.mailService.sendMail({
        to: adminEmail,
        subject: `🔔 New Refund Request - ${data.bookingReference}`,
        template: 'refund-request-admin',
        context: {
          ...this.getCommonContext(),
          ...data,
          adminUrl,
        },
      });

      this.logger.log(
        `Admin notification sent for refund request: ${data.bookingReference}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send admin refund notification: ${error.message}`,
        error.stack,
      );
      // Don't throw - notification failure shouldn't block the main operation
    }
  }

  /**
   * Send notification to guest when refund status changes
   */
  async notifyGuestOfRefundStatus(data: GuestRefundNotificationData): Promise<void> {
    try {
      const subjectMap = {
        pending: `Refund Request Received - ${data.bookingReference}`,
        approved: `✅ Refund Approved - ${data.bookingReference}`,
        denied: `Refund Request Update - ${data.bookingReference}`,
        processed: `💰 Refund Processed - ${data.bookingReference}`,
      };

      await this.mailService.sendMail({
        to: data.guestEmail,
        subject: subjectMap[data.status],
        template: 'refund-status-guest',
        context: {
          ...this.getCommonContext(),
          ...data,
        },
      });

      this.logger.log(
        `Guest notification sent for refund status '${data.status}': ${data.bookingReference}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send guest refund notification: ${error.message}`,
        error.stack,
      );
      // Don't throw - notification failure shouldn't block the main operation
    }
  }

  /**
   * Send confirmation to guest when they submit a refund request
   */
  async notifyGuestOfRefundSubmission(data: GuestRefundNotificationData): Promise<void> {
    try {
      await this.mailService.sendMail({
        to: data.guestEmail,
        subject: `📋 Refund Request Submitted - ${data.bookingReference}`,
        template: 'refund-status-guest',
        context: {
          ...this.getCommonContext(),
          ...data,
          status: 'pending',
        },
      });

      this.logger.log(
        `Guest submission confirmation sent: ${data.bookingReference}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send guest submission notification: ${error.message}`,
        error.stack,
      );
    }
  }
}
