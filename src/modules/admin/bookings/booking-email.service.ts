/**
 * ============================================
 * ADMIN BOOKING EMAIL SERVICE
 * ============================================
 *
 * Service for sending booking-related emails from admin panel.
 * - Payment reminder emails
 * - Booking details emails
 */

import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { getEnvironmentData } from 'src/helpers/general';
import { BOOKINGS_REPOSITORY, PAYMENTS_REPOSITORY } from 'src/config/constants';
import {
  Bookings,
  BookingRooms,
  BookingAddons,
  WeddingGroups,
  Guests,
  Hotels,
  GroupRoomBlocks,
  GroupAddons,
  RoomTypes,
  Payments,
} from 'src/models';

@Injectable()
export class BookingEmailService {
  private readonly logger = new Logger(BookingEmailService.name);

  constructor(
    private readonly mailerService: MailerService,
    @Inject(BOOKINGS_REPOSITORY) private bookingsRepository: typeof Bookings,
    @Inject(PAYMENTS_REPOSITORY) private paymentsRepository: typeof Payments,
  ) {}

  /**
   * Send payment reminder email to guest
   */
  async sendPaymentReminder(bookingUuid: string): Promise<{ success: boolean; message: string }> {
    const booking = await this.getBookingWithDetails(bookingUuid);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Calculate paid amount
    const payments = await this.paymentsRepository.findAll({
      where: { booking_id: booking.id, status: 'success' },
    });
    const paidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balanceAmount = Number(booking.total_amount) - paidAmount;

    if (balanceAmount <= 0) {
      return {
        success: false,
        message: 'No balance due - booking is fully paid',
      };
    }

    const appName = getEnvironmentData('APP_NAME') || 'DestaPay';
    const logoUrl = getEnvironmentData('APP_LOGO_URL') || '';
    const frontendUrl = getEnvironmentData('FRONTEND_URL') || getEnvironmentData('APP_URL') || '';

    const weddingGroup = booking.wedding_group;
    const guest = booking.guest;

    // Build payment URL
    const makePaymentUrl = `${frontendUrl}/my-booking?ref=${booking.booking_reference}#payment`;

    const context = {
      appName,
      logoUrl,
      currentYear: new Date().getFullYear(),

      // Guest
      guestName: guest?.name || 'Guest',
      guestEmail: guest?.email,

      // Booking
      bookingReference: booking.booking_reference,
      checkInDate: this.formatDate(booking.check_in_date),
      checkOutDate: this.formatDate(booking.check_out_date),

      // Wedding
      coupleName: `${weddingGroup?.bride_name || ''} & ${weddingGroup?.groom_name || ''}`,

      // Hotel
      hotelName: weddingGroup?.hotel?.name || '',

      // Pricing
      totalAmount: this.formatCurrency(Number(booking.total_amount), booking.currency),
      paidAmount: this.formatCurrency(paidAmount, booking.currency),
      balanceAmount: this.formatCurrency(balanceAmount, booking.currency),

      // Due date (final payment due date based on wedding group settings)
      balanceDueDate: weddingGroup?.event_start_date
        ? this.calculateDueDate(weddingGroup.event_start_date, weddingGroup.final_payment_due_days || 30)
        : null,

      // URLs
      makePaymentUrl,
    };

    try {
      await this.mailerService.sendMail({
        to: guest?.email,
        subject: `Payment Reminder - ${booking.booking_reference} | ${context.coupleName}'s Wedding`,
        template: 'payment-reminder',
        context,
      });

      this.logger.log(`Payment reminder sent to ${guest?.email} for ${booking.booking_reference}`);

      return {
        success: true,
        message: `Payment reminder sent to ${guest?.email}`,
      };
    } catch (error) {
      this.logger.error(`Failed to send payment reminder: ${error.message}`, error.stack);

      return {
        success: false,
        message: `Failed to send email: ${error.message}`,
      };
    }
  }

  /**
   * Send booking details email to guest
   */
  async sendBookingDetails(bookingUuid: string): Promise<{ success: boolean; message: string }> {
    const booking = await this.getBookingWithDetails(bookingUuid);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Calculate paid amount
    const payments = await this.paymentsRepository.findAll({
      where: { booking_id: booking.id, status: 'success' },
    });
    const paidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balanceAmount = Number(booking.total_amount) - paidAmount;

    const appName = getEnvironmentData('APP_NAME') || 'DestaPay';
    const logoUrl = getEnvironmentData('APP_LOGO_URL') || '';
    const frontendUrl = getEnvironmentData('FRONTEND_URL') || getEnvironmentData('APP_URL') || '';

    const weddingGroup = booking.wedding_group;
    const guest = booking.guest;
    const hotel = weddingGroup?.hotel;

    // Build URLs
    const viewBookingUrl = `${frontendUrl}/my-booking?ref=${booking.booking_reference}`;

    // Build room details
    const rooms = (booking.booking_rooms || []).map((room) => ({
      roomTypeName: room.room_block?.room_type?.name || 'Room',
      quantity: room.quantity,
      pricePerNight: this.formatCurrency(Number(room.price_per_night), booking.currency),
      totalPrice: this.formatCurrency(Number(room.subtotal), booking.currency),
    }));

    // Build addon details
    const addons = (booking.booking_addons || []).map((addon) => ({
      addonName: addon.group_addon?.name || 'Add-on',
      quantity: addon.quantity,
      totalPrice: this.formatCurrency(Number(addon.subtotal), booking.currency),
    }));

    const context = {
      appName,
      logoUrl,
      currentYear: new Date().getFullYear(),

      // Guest
      guestName: guest?.name || 'Guest',
      guestEmail: guest?.email,

      // Booking
      bookingReference: booking.booking_reference,
      checkInDate: this.formatDate(booking.check_in_date),
      checkOutDate: this.formatDate(booking.check_out_date),
      totalNights: booking.total_nights,
      totalRooms: booking.total_rooms,
      totalAdults: booking.total_adults,
      totalChildren: booking.total_children,
      specialRequests: booking.special_requests,

      // Wedding
      coupleName: `${weddingGroup?.bride_name || ''} & ${weddingGroup?.groom_name || ''}`,
      eventStartDate: this.formatDate(weddingGroup?.event_start_date),

      // Hotel
      hotelName: hotel?.name || '',
      hotelLocation: hotel ? `${hotel.city}, ${hotel.country}` : '',

      // Rooms & Addons
      rooms,
      hasAddons: addons.length > 0,
      addons,

      // Pricing
      totalAmount: this.formatCurrency(Number(booking.total_amount), booking.currency),
      depositAmount: this.formatCurrency(paidAmount, booking.currency),
      balanceAmount: this.formatCurrency(balanceAmount, booking.currency),

      // Status
      statusLabel: this.getStatusLabel(booking.status),
      statusClass: this.getStatusClass(booking.status),

      // URLs
      viewBookingUrl,
    };

    try {
      await this.mailerService.sendMail({
        to: guest?.email,
        subject: `Your Booking Details - ${booking.booking_reference} | ${context.coupleName}'s Wedding`,
        template: 'booking-details',
        context,
      });

      this.logger.log(`Booking details sent to ${guest?.email} for ${booking.booking_reference}`);

      return {
        success: true,
        message: `Booking details sent to ${guest?.email}`,
      };
    } catch (error) {
      this.logger.error(`Failed to send booking details: ${error.message}`, error.stack);

      return {
        success: false,
        message: `Failed to send email: ${error.message}`,
      };
    }
  }

  /**
   * Get booking with all related details
   */
  private async getBookingWithDetails(uuid: string) {
    return this.bookingsRepository.findOne({
      where: { uuid },
      include: [
        {
          model: Guests,
          as: 'guest',
          attributes: ['uuid', 'name', 'email', 'phone'],
        },
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: ['uuid', 'name', 'bride_name', 'groom_name', 'event_start_date', 'event_end_date', 'final_payment_due_days'],
          include: [
            {
              model: Hotels,
              as: 'hotel',
              attributes: ['uuid', 'name', 'address', 'city', 'country', 'phone'],
            },
          ],
        },
        {
          model: BookingRooms,
          as: 'booking_rooms',
          include: [
            {
              model: GroupRoomBlocks,
              as: 'room_block',
              include: [
                {
                  model: RoomTypes,
                  as: 'room_type',
                  attributes: ['uuid', 'name'],
                },
              ],
            },
          ],
        },
        {
          model: BookingAddons,
          as: 'booking_addons',
          include: [
            {
              model: GroupAddons,
              as: 'group_addon',
              attributes: ['uuid', 'name'],
            },
          ],
        },
      ],
    });
  }

  /**
   * Format date for display
   * Handles date-only strings (YYYY-MM-DD) without timezone conversion
   */
  private formatDate(date: Date | string | null): string {
    if (!date) return 'N/A';

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
   * Calculate due date
   * Handles date-only strings (YYYY-MM-DD) without timezone conversion
   */
  private calculateDueDate(eventDate: string | Date, daysBefore: number): string {
    let event: Date;

    // If it's a date-only string (YYYY-MM-DD), parse it without timezone shift
    if (typeof eventDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      const [year, month, day] = eventDate.split('-').map(Number);
      event = new Date(year, month - 1, day);
    } else {
      event = new Date(eventDate);
    }

    event.setDate(event.getDate() - daysBefore);

    // Format without weekday for due date
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
    const symbol = this.getCurrencySymbol(currency);
    return `${symbol}${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Get currency symbol
   */
  private getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
      USD: '$',
      CAD: 'C$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
      MXN: 'MX$',
    };
    return symbols[currency] || `${currency} `;
  }

  /**
   * Get human-readable status label
   */
  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Awaiting Payment',
      deposit_paid: 'Deposit Paid - Balance Due',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  }

  /**
   * Get CSS class for status
   */
  private getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'status-pending',
      deposit_paid: 'status-partial',
      confirmed: 'status-confirmed',
      completed: 'status-confirmed',
      cancelled: 'status-pending',
    };
    return classes[status] || 'status-pending';
  }
}
