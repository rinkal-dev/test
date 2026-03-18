/**
 * ============================================
 * BOOKING CONFIRMATION EMAIL SERVICE
 * ============================================
 *
 * Service for sending booking confirmation emails to guests.
 * Called after successful booking creation in the booking wizard.
 */

import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { getEnvironmentData } from '../../../helpers/general';

export interface FinalPaymentConfirmationData {
  // Guest Info
  guestName: string;
  guestEmail: string;
  guestAccessToken: string;

  // Booking Info
  bookingReference: string;
  checkInDate: string;
  checkOutDate: string;
  totalNights: number;
  totalAdults: number;
  totalChildren: number;

  // Wedding/Event Info
  weddingName: string;
  brideName: string;
  groomName: string;

  // Contact Info
  brideEmail?: string;
  bridePhone?: string;
  groomEmail?: string;
  groomPhone?: string;
  hotelContactName?: string;
  hotelContactEmail?: string;
  hotelContactPhone?: string;

  // Hotel Info
  hotelName: string;
  hotelCity: string;
  hotelCountry: string;
  hotelAddress?: string;

  // Invoice Info
  invoiceNumber: string;
  paymentDate: string;

  // Payment Info
  finalPaymentAmount: number;
  depositAmount: number;
  totalAmount: number;
  currency: string;
}

export interface BookingConfirmationData {
  // Guest Info
  guestName: string;
  guestEmail: string;
  guestAccessToken: string;
  guestId?: number;
  hasPassword?: boolean;
  setPasswordToken?: string;

  // Booking Info
  bookingReference: string;
  bookingUuid: string;
  checkInDate: string;
  checkOutDate: string;
  totalNights: number;
  totalRooms: number;
  totalAdults: number;
  totalChildren: number;
  specialRequests?: string;

  // Wedding/Event Info
  weddingName: string;
  brideName: string;
  groomName: string;
  eventStartDate: string;
  eventEndDate: string;

  // Contact Info (shown after booking confirmation)
  brideEmail?: string;
  bridePhone?: string;
  groomEmail?: string;
  groomPhone?: string;
  hotelContactName?: string;
  hotelContactEmail?: string;
  hotelContactPhone?: string;

  // Hotel Info
  hotelName: string;
  hotelCity: string;
  hotelCountry: string;
  hotelAddress?: string;
  hotelPhone?: string;
  hotelWebsite?: string;

  // Room Details
  rooms: Array<{
    roomTypeName: string;
    quantity: number;
    pricePerNight: number;
    totalPrice: number;
  }>;

  // Add-on Details
  addons?: Array<{
    addonName: string;
    quantity: number;
    totalPrice: number;
  }>;

  // Pricing
  subtotal?: number;  // Pre-tax amount
  taxRate?: number;   // Tax rate percentage
  taxAmount?: number; // Calculated tax
  totalAmount: number;  // Total INCLUDING taxes
  depositAmount: number;
  balanceAmount: number;
  currency: string;

  // Payment Schedule
  depositDueNow: number;
  balanceDueDate: string;

  // Status
  status: string;
  depositPaid: boolean;
}

@Injectable()
export class BookingConfirmationEmailService {
  private readonly logger = new Logger(BookingConfirmationEmailService.name);

  constructor(private readonly mailerService: MailerService) {}

  /**
   * Send booking confirmation email to guest
   */
  async sendConfirmationEmail(data: BookingConfirmationData): Promise<{ success: boolean; message: string }> {
    const appName = getEnvironmentData('APP_NAME') || 'DestaPay';
    const logoUrl = getEnvironmentData('APP_LOGO_URL') || '';
    const frontendUrl = getEnvironmentData('FRONTEND_URL') || getEnvironmentData('APP_URL') || '';

    // Build URLs
    const viewBookingUrl = `${frontendUrl}/my-booking?token=${data.guestAccessToken}`;
    const makePaymentUrl = `${frontendUrl}/my-booking?token=${data.guestAccessToken}#payment`;
    const myBookingUrl = `${frontendUrl}/my-booking`;

    // Set password URL (only if guest doesn't have password and token is provided)
    const setPasswordUrl = !data.hasPassword && data.setPasswordToken
      ? `${frontendUrl}/my-booking/set-password?token=${data.setPasswordToken}&email=${encodeURIComponent(data.guestEmail)}`
      : null;

    // Build email context
    const context = {
      appName,
      logoUrl,
      currentYear: new Date().getFullYear(),

      // Guest
      guestName: data.guestName,

      // Booking
      bookingReference: data.bookingReference,
      checkInDate: this.formatDate(data.checkInDate),
      checkOutDate: this.formatDate(data.checkOutDate),
      totalNights: data.totalNights,
      totalRooms: data.totalRooms,
      totalAdults: data.totalAdults,
      totalChildren: data.totalChildren,
      specialRequests: data.specialRequests,

      // Wedding/Event
      weddingName: data.weddingName,
      brideName: data.brideName,
      groomName: data.groomName,
      coupleName: `${data.brideName} & ${data.groomName}`,
      eventStartDate: this.formatDate(data.eventStartDate),
      eventEndDate: this.formatDate(data.eventEndDate),

      // Hotel
      hotelName: data.hotelName,
      hotelCity: data.hotelCity,
      hotelCountry: data.hotelCountry,
      hotelLocation: `${data.hotelCity}, ${data.hotelCountry}`,
      hotelAddress: data.hotelAddress,
      hotelPhone: data.hotelPhone,
      hotelWebsite: data.hotelWebsite,

      // Contact Info (shown to confirmed guests)
      brideEmail: data.brideEmail,
      bridePhone: data.bridePhone,
      groomEmail: data.groomEmail,
      groomPhone: data.groomPhone,
      hotelContactName: data.hotelContactName,
      hotelContactEmail: data.hotelContactEmail,
      hotelContactPhone: data.hotelContactPhone,
      hasContacts: !!(data.brideEmail || data.bridePhone || data.groomEmail || data.groomPhone || data.hotelContactEmail || data.hotelContactPhone),

      // Rooms
      rooms: data.rooms.map((room) => ({
        ...room,
        pricePerNight: this.formatCurrency(room.pricePerNight, data.currency),
        totalPrice: this.formatCurrency(room.totalPrice, data.currency),
      })),

      // Addons
      hasAddons: data.addons && data.addons.length > 0,
      addons: (data.addons || []).map((addon) => ({
        ...addon,
        totalPrice: this.formatCurrency(addon.totalPrice, data.currency),
      })),

      // Pricing - Calculate accommodation and addon totals for email template
      accommodationTotal: this.formatCurrency(
        data.rooms.reduce((sum, room) => sum + room.totalPrice, 0),
        data.currency,
      ),
      addonsTotal: this.formatCurrency(
        (data.addons || []).reduce((sum, addon) => sum + addon.totalPrice, 0),
        data.currency,
      ),
      totalAmount: this.formatCurrency(data.totalAmount, data.currency),
      depositAmount: this.formatCurrency(data.depositAmount, data.currency),
      balanceAmount: this.formatCurrency(data.balanceAmount, data.currency),
      currency: data.currency,
      currencySymbol: this.getCurrencySymbol(data.currency),

      // Payment Schedule
      depositDueNow: this.formatCurrency(data.depositDueNow, data.currency),
      balanceDueDate: this.formatDate(data.balanceDueDate),

      // Status
      status: data.status,
      depositPaid: data.depositPaid,
      statusLabel: this.getStatusLabel(data.status),
      statusClass: this.getStatusClass(data.status),

      // URLs
      viewBookingUrl,
      makePaymentUrl,
      myBookingUrl,
      setPasswordUrl,

      // Password setup
      hasPassword: data.hasPassword || false,
      guestEmail: data.guestEmail,
    };

    // Determine subject based on payment status
    const subject = data.depositPaid
      ? `Booking Confirmed - ${data.bookingReference} | ${data.brideName} & ${data.groomName}'s Wedding`
      : `Booking Received - ${data.bookingReference} | ${data.brideName} & ${data.groomName}'s Wedding`;

    try {
      await this.mailerService.sendMail({
        to: data.guestEmail,
        subject,
        template: 'booking-confirmation',
        context,
      });

      this.logger.log(`Booking confirmation email sent to ${data.guestEmail} for ${data.bookingReference}`);

      return {
        success: true,
        message: `Confirmation email sent to ${data.guestEmail}`,
      };
    } catch (error) {
      this.logger.error(`Failed to send booking confirmation email: ${error.message}`, error.stack);

      return {
        success: false,
        message: `Failed to send email: ${error.message}`,
      };
    }
  }

  /**
   * Send final payment confirmation email to guest
   */
  async sendFinalPaymentConfirmationEmail(data: FinalPaymentConfirmationData): Promise<{ success: boolean; message: string }> {
    const appName = getEnvironmentData('APP_NAME') || 'DestaPay';
    const logoUrl = getEnvironmentData('APP_LOGO_URL') || '';
    const frontendUrl = getEnvironmentData('FRONTEND_URL') || getEnvironmentData('APP_URL') || '';

    // Build URLs
    const viewBookingUrl = `${frontendUrl}/my-booking?token=${data.guestAccessToken}`;

    // Build email context
    const context = {
      appName,
      logoUrl,
      currentYear: new Date().getFullYear(),

      // Guest
      guestName: data.guestName,

      // Booking
      bookingReference: data.bookingReference,
      checkInDate: this.formatDate(data.checkInDate),
      checkOutDate: this.formatDate(data.checkOutDate),
      totalNights: data.totalNights,
      totalAdults: data.totalAdults,
      totalChildren: data.totalChildren,

      // Wedding/Event
      weddingName: data.weddingName,
      brideName: data.brideName,
      groomName: data.groomName,
      coupleName: `${data.brideName} & ${data.groomName}`,

      // Hotel
      hotelName: data.hotelName,
      hotelLocation: `${data.hotelCity}, ${data.hotelCountry}`,
      hotelAddress: data.hotelAddress,

      // Contact Info
      brideEmail: data.brideEmail,
      bridePhone: data.bridePhone,
      groomEmail: data.groomEmail,
      groomPhone: data.groomPhone,
      hotelContactName: data.hotelContactName,
      hotelContactEmail: data.hotelContactEmail,
      hotelContactPhone: data.hotelContactPhone,
      hasContacts: !!(data.brideEmail || data.bridePhone || data.groomEmail || data.groomPhone || data.hotelContactEmail || data.hotelContactPhone),

      // Invoice
      invoiceNumber: data.invoiceNumber,
      paymentDate: this.formatDate(data.paymentDate),

      // Payment
      finalPaymentAmount: this.formatCurrency(data.finalPaymentAmount, data.currency),
      depositAmount: this.formatCurrency(data.depositAmount, data.currency),
      totalAmount: this.formatCurrency(data.totalAmount, data.currency),
      currency: this.getCurrencySymbol(data.currency),

      // URLs
      viewBookingUrl,
    };

    const subject = `Booking Fully Confirmed - ${data.bookingReference} | ${data.brideName} & ${data.groomName}'s Wedding`;

    try {
      await this.mailerService.sendMail({
        to: data.guestEmail,
        subject,
        template: 'final-payment-confirmation',
        context,
      });

      this.logger.log(`Final payment confirmation email sent to ${data.guestEmail} for ${data.bookingReference}`);

      return {
        success: true,
        message: `Final payment confirmation email sent to ${data.guestEmail}`,
      };
    } catch (error) {
      this.logger.error(`Failed to send final payment confirmation email: ${error.message}`, error.stack);

      return {
        success: false,
        message: `Failed to send email: ${error.message}`,
      };
    }
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
      const d = new Date(year, month - 1, day); // Local date, no timezone shift
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
   * Format currency amount
   */
  private formatCurrency(amount: number, currency: string): string {
    const symbol = this.getCurrencySymbol(currency);
    return `${symbol}${Number(amount || 0).toFixed(2)}`;
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
      deposit_paid: 'Deposit Paid',
      fully_paid: 'Fully Paid',
      confirmed: 'Confirmed',
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
      fully_paid: 'status-paid',
      confirmed: 'status-confirmed',
      cancelled: 'status-cancelled',
    };
    return classes[status] || 'status-pending';
  }
}
