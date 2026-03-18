/**
 * ============================================
 * PAYMENT REMINDERS SERVICE (Fallback)
 * ============================================
 *
 * Cron job that runs as a fallback when N8N is not active.
 * - Runs daily at 10 AM (1 hour after N8N's 9 AM schedule)
 * - Checks if reminders were already sent by N8N
 * - Sends reminders only if not already sent
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Op, Sequelize } from 'sequelize';
import { MailerService } from '@nestjs-modules/mailer';
import { getEnvironmentData } from 'src/helpers/general';
import {
  BOOKINGS_REPOSITORY,
  PAYMENTS_REPOSITORY,
} from 'src/config/constants';
import {
  Bookings,
  Guests,
  WeddingGroups,
  Hotels,
  Payments,
  PaymentReminderLogs,
} from 'src/models';

// Reminder intervals (days before due date)
const REMINDER_INTERVALS = [30, 14, 7, 2];

interface BookingWithDetails extends Bookings {
  guest: Guests;
  wedding_group: WeddingGroups & { hotel: Hotels };
}

@Injectable()
export class PaymentRemindersService {
  private readonly logger = new Logger(PaymentRemindersService.name);

  constructor(
    private readonly mailerService: MailerService,
    @Inject(BOOKINGS_REPOSITORY)
    private bookingsRepository: typeof Bookings,
    @Inject(PAYMENTS_REPOSITORY)
    private paymentsRepository: typeof Payments,
  ) {}

  /**
   * Cron job: Runs daily at 10:00 AM
   * This is the fallback for when N8N is not active
   */
  @Cron('0 10 * * *', {
    name: 'payment-reminders-fallback',
    timeZone: 'UTC',
  })
  async handlePaymentReminders() {
    this.logger.log('Starting payment reminder fallback job...');

    try {
      let totalSent = 0;
      let totalSkipped = 0;

      // Process each reminder interval
      for (const daysBeforeDue of REMINDER_INTERVALS) {
        const result = await this.processRemindersForInterval(daysBeforeDue);
        totalSent += result.sent;
        totalSkipped += result.skipped;
      }

      this.logger.log(
        `Payment reminder job completed. Sent: ${totalSent}, Skipped: ${totalSkipped}`,
      );
    } catch (error) {
      this.logger.error('Payment reminder job failed:', error);
    }
  }

  /**
   * Process reminders for a specific interval (e.g., 30 days, 14 days, etc.)
   */
  async processRemindersForInterval(
    daysBeforeDue: number,
  ): Promise<{ sent: number; skipped: number }> {
    const reminderType = `${daysBeforeDue}_days`;
    this.logger.log(`Processing ${reminderType} reminders...`);

    let sent = 0;
    let skipped = 0;

    // Get bookings with deposit_paid status (balance due)
    const bookings = await this.getBookingsWithPaymentDue(daysBeforeDue);

    for (const booking of bookings) {
      try {
        // Check if reminder was already sent today
        const alreadySent = await this.wasReminderSentToday(
          booking.id,
          reminderType,
        );

        if (alreadySent) {
          this.logger.debug(
            `Skipping ${booking.booking_reference} - ${reminderType} already sent`,
          );
          skipped++;
          continue;
        }

        // Send the reminder
        const success = await this.sendPaymentReminder(
          booking as BookingWithDetails,
          daysBeforeDue,
        );

        if (success) {
          // Log the sent reminder
          await this.logReminderSent(booking.id, reminderType, 'backend');
          sent++;
          this.logger.log(
            `Sent ${reminderType} reminder to ${booking.guest?.email} for ${booking.booking_reference}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to process reminder for ${booking.booking_reference}:`,
          error,
        );
      }
    }

    this.logger.log(`${reminderType}: Sent ${sent}, Skipped ${skipped}`);
    return { sent, skipped };
  }

  /**
   * Get bookings with payment due within the specified days window
   */
  private async getBookingsWithPaymentDue(
    daysBeforeDue: number,
  ): Promise<Bookings[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate target due date range (exact day match for the interval)
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + daysBeforeDue);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    return this.bookingsRepository.findAll({
      where: {
        status: 'deposit_paid', // Only bookings with balance due
      },
      include: [
        {
          model: Guests,
          as: 'guest',
          attributes: ['uuid', 'name', 'email', 'phone'],
        },
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: [
            'uuid',
            'name',
            'bride_name',
            'groom_name',
            'event_start_date',
            'final_payment_due_days',
          ],
          include: [
            {
              model: Hotels,
              as: 'hotel',
              attributes: ['uuid', 'name'],
            },
          ],
        },
      ],
    }).then((bookings) => {
      this.logger.log(`Found ${bookings.length} deposit_paid bookings, filtering for ${daysBeforeDue} days...`);

      // Filter based on due date calculation
      const filtered = bookings.filter((booking) => {
        const weddingGroup = booking.wedding_group;
        if (!weddingGroup?.event_start_date) return false;

        // Parse date without timezone issues (YYYY-MM-DD format)
        const eventDateStr = String(weddingGroup.event_start_date).split('T')[0];
        const [year, month, day] = eventDateStr.split('-').map(Number);
        const eventDate = new Date(year, month - 1, day);

        const finalPaymentDueDays = weddingGroup.final_payment_due_days || 30;
        const dueDate = new Date(eventDate);
        dueDate.setDate(dueDate.getDate() - finalPaymentDueDays);

        // Calculate days until due
        const daysUntilDue = Math.floor(
          (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        this.logger.log(
          `${booking.booking_reference}: daysUntilDue=${daysUntilDue}, target=${daysBeforeDue}, match=${daysUntilDue === daysBeforeDue}`,
        );

        // Match if days until due equals our target interval
        return daysUntilDue === daysBeforeDue;
      });

      this.logger.log(`After filtering: ${filtered.length} bookings match ${daysBeforeDue}_days interval`);
      return filtered;
    });
  }

  /**
   * Check if a reminder was already sent today for this booking and type
   */
  private async wasReminderSentToday(
    bookingId: number,
    reminderType: string,
  ): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingLog = await PaymentReminderLogs.findOne({
      where: {
        booking_id: bookingId,
        reminder_type: reminderType,
        sent_at: {
          [Op.gte]: today,
          [Op.lt]: tomorrow,
        },
      },
    });

    return !!existingLog;
  }

  /**
   * Log that a reminder was sent
   */
  async logReminderSent(
    bookingId: number,
    reminderType: string,
    sentVia: 'n8n' | 'backend',
  ): Promise<PaymentReminderLogs> {
    const now = new Date();
    return PaymentReminderLogs.create({
      booking_id: bookingId,
      reminder_type: reminderType,
      sent_via: sentVia,
      sent_at: now,
      created_at: now,
    });
  }

  /**
   * Log reminder sent by N8N (called from external API)
   */
  async logReminderFromN8N(
    bookingReference: string,
    reminderType: string,
  ): Promise<{ success: boolean; message: string }> {
    const booking = await this.bookingsRepository.findOne({
      where: { booking_reference: bookingReference },
    });

    if (!booking) {
      return { success: false, message: 'Booking not found' };
    }

    // Check if already logged today
    const alreadyLogged = await this.wasReminderSentToday(
      booking.id,
      reminderType,
    );

    if (alreadyLogged) {
      return { success: true, message: 'Already logged' };
    }

    await this.logReminderSent(booking.id, reminderType, 'n8n');
    return { success: true, message: 'Logged successfully' };
  }

  /**
   * Send payment reminder email
   */
  private async sendPaymentReminder(
    booking: BookingWithDetails,
    daysBeforeDue: number,
  ): Promise<boolean> {
    try {
      // Calculate paid amount
      const payments = await this.paymentsRepository.findAll({
        where: { booking_id: booking.id, status: 'success' },
      });
      const paidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const balanceAmount = Number(booking.total_amount) - paidAmount;

      if (balanceAmount <= 0) {
        this.logger.debug(
          `Skipping ${booking.booking_reference} - fully paid`,
        );
        return false;
      }

      const appName = getEnvironmentData('APP_NAME') || 'DestaPay';
      const logoUrl = getEnvironmentData('APP_LOGO_URL') || '';
      const frontendUrl =
        getEnvironmentData('FRONTEND_URL') ||
        getEnvironmentData('APP_URL') ||
        '';

      const weddingGroup = booking.wedding_group;
      const guest = booking.guest;

      if (!guest?.email) {
        this.logger.warn(
          `Skipping ${booking.booking_reference} - no guest email`,
        );
        return false;
      }

      // Build payment URL
      const makePaymentUrl = `${frontendUrl}/my-booking?ref=${booking.booking_reference}`;

      // Determine urgency level for subject line
      let urgencyPrefix = '';
      if (daysBeforeDue <= 2) {
        urgencyPrefix = 'URGENT: ';
      } else if (daysBeforeDue <= 7) {
        urgencyPrefix = 'Important: ';
      }

      const context = {
        appName,
        logoUrl,
        currentYear: new Date().getFullYear(),

        // Guest
        guestName: guest.name || 'Guest',
        guestEmail: guest.email,

        // Booking
        bookingReference: booking.booking_reference,
        checkInDate: this.formatDate(booking.check_in_date),
        checkOutDate: this.formatDate(booking.check_out_date),

        // Wedding
        coupleName: `${weddingGroup?.bride_name || ''} & ${weddingGroup?.groom_name || ''}`,

        // Hotel
        hotelName: weddingGroup?.hotel?.name || '',

        // Pricing
        totalAmount: this.formatCurrency(
          Number(booking.total_amount),
          booking.currency,
        ),
        paidAmount: this.formatCurrency(paidAmount, booking.currency),
        balanceAmount: this.formatCurrency(balanceAmount, booking.currency),

        // Due date
        balanceDueDate: weddingGroup?.event_start_date
          ? this.calculateDueDate(
              weddingGroup.event_start_date,
              weddingGroup.final_payment_due_days || 30,
            )
          : null,

        // URLs
        makePaymentUrl,

        // Reminder info
        daysBeforeDue,
      };

      await this.mailerService.sendMail({
        to: guest.email,
        subject: `${urgencyPrefix}Payment Reminder - ${booking.booking_reference} | ${context.coupleName}'s Wedding`,
        template: 'payment-reminder',
        context,
      });

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send email for ${booking.booking_reference}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date | string | null): string {
    if (!date) return 'N/A';

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
   * Calculate due date
   */
  private calculateDueDate(
    eventDate: string | Date,
    daysBefore: number,
  ): string {
    let event: Date;

    if (typeof eventDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      const [year, month, day] = eventDate.split('-').map(Number);
      event = new Date(year, month - 1, day);
    } else {
      event = new Date(eventDate);
    }

    event.setDate(event.getDate() - daysBefore);

    return event.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Format currency amount
   */
  private formatCurrency(amount: number, currency: string): string {
    const symbols: Record<string, string> = {
      USD: '$',
      CAD: 'C$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
      MXN: 'MX$',
    };
    const symbol = symbols[currency] || `${currency} `;
    return `${symbol}${Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  /**
   * Manual trigger for testing (can be called via API)
   */
  async triggerManually(): Promise<{
    success: boolean;
    message: string;
    results: { sent: number; skipped: number };
  }> {
    this.logger.log('Manual payment reminder trigger initiated');

    let totalSent = 0;
    let totalSkipped = 0;

    for (const daysBeforeDue of REMINDER_INTERVALS) {
      const result = await this.processRemindersForInterval(daysBeforeDue);
      totalSent += result.sent;
      totalSkipped += result.skipped;
    }

    return {
      success: true,
      message: `Payment reminders processed. Sent: ${totalSent}, Skipped: ${totalSkipped}`,
      results: { sent: totalSent, skipped: totalSkipped },
    };
  }
}
