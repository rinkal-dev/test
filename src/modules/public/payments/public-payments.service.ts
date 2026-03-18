import { Injectable, NotFoundException, BadRequestException, Logger, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { StripeService } from './stripe.service';
import { CreatePaymentIntentDto, PaymentTypeEnum } from './dto/CreatePaymentIntentDto';
import { Payments } from '../../../models/Payments';
import { Bookings } from '../../../models/Bookings';
import { Guests } from '../../../models/Guests';
import { WeddingGroups } from '../../../models/WeddingGroups';
import { Hotels } from '../../../models/Hotels';
import { InvoicesService } from '../../admin/invoices/invoices.service';
import { InvoiceEmailService } from '../../admin/invoices/services/invoice-email.service';
import { BookingConfirmationEmailService, FinalPaymentConfirmationData } from '../booking-confirmations/booking-confirmation-email.service';
import { EventsService } from '../../events/events.service';
import { EventType } from '../../events/event-types';

@Injectable()
export class PublicPaymentsService {
  private readonly logger = new Logger(PublicPaymentsService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly invoicesService: InvoicesService,
    private readonly invoiceEmailService: InvoiceEmailService,
    private readonly bookingConfirmationEmailService: BookingConfirmationEmailService,
    private readonly eventsService: EventsService,
    @Inject('PAYMENTS_REPOSITORY')
    private paymentsRepository: typeof Payments,
    @Inject('BOOKINGS_REPOSITORY')
    private bookingsRepository: typeof Bookings,
  ) {}

  /**
   * Create a Stripe PaymentIntent for a booking payment
   */
  async createPaymentIntent(dto: CreatePaymentIntentDto) {
    // Find the booking
    const booking = await this.bookingsRepository.findOne({
      where: { uuid: dto.booking_uuid },
      include: [
        { model: Guests, as: 'guest' },
        { model: WeddingGroups, as: 'wedding_group' },
      ],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Validate payment type based on booking status
    if (dto.payment_type === PaymentTypeEnum.DEPOSIT) {
      if (booking.status !== 'pending') {
        throw new BadRequestException('Deposit can only be paid for pending bookings');
      }
    } else if (dto.payment_type === PaymentTypeEnum.FINAL) {
      if (booking.status !== 'deposit_paid') {
        throw new BadRequestException('Final payment can only be made after deposit is paid');
      }
    }

    // Determine the amount
    let amount: number;
    let currency: string = dto.currency || booking.currency || 'USD';

    if (dto.amount) {
      amount = dto.amount;
    } else {
      if (dto.payment_type === PaymentTypeEnum.DEPOSIT) {
        amount = Number(booking.deposit_amount);
      } else {
        // Final payment is total minus deposit
        amount = Number(booking.total_amount) - Number(booking.deposit_amount);
      }
    }

    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    // Check for existing pending payment (idempotency - prevents duplicate PaymentIntents from React Strict Mode)
    const existingPayment = await this.paymentsRepository.findOne({
      where: {
        booking_id: booking.id,
        payment_type: dto.payment_type,
        status: 'pending',
      },
      order: [['created_at', 'DESC']],
    });

    if (existingPayment && existingPayment.payment_intent_id) {
      try {
        // Retrieve the existing PaymentIntent from Stripe
        const existingIntent = await this.stripeService.retrievePaymentIntent(existingPayment.payment_intent_id);

        // Only reuse if the PaymentIntent is still usable
        if (existingIntent.status === 'requires_payment_method' || existingIntent.status === 'requires_confirmation') {
          this.logger.log(`Reusing existing payment ${existingPayment.uuid} with PaymentIntent ${existingIntent.id} for booking ${booking.booking_reference}`);

          return {
            payment_uuid: existingPayment.uuid,
            client_secret: existingIntent.client_secret,
            payment_intent_id: existingIntent.id,
            amount: Number(existingPayment.amount),
            currency: existingPayment.currency,
            booking_reference: booking.booking_reference,
          };
        }
      } catch (error) {
        // PaymentIntent retrieval failed, create a new one
        this.logger.warn(`Failed to retrieve existing PaymentIntent ${existingPayment.payment_intent_id}, creating new one`);
      }
    }

    // Create Stripe PaymentIntent
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount,
      currency,
      bookingUuid: booking.uuid,
      bookingReference: booking.booking_reference,
      customerEmail: dto.customer_email,
      customerName: dto.customer_name,
      paymentType: dto.payment_type,
      metadata: {
        wedding_group_uuid: booking.wedding_group?.uuid || '',
        wedding_group_name: booking.wedding_group?.name || '',
      },
    });

    // Create a pending payment record
    const payment = await this.paymentsRepository.create({
      uuid: uuidv4(),
      booking_id: booking.id,
      payment_type: dto.payment_type,
      payment_gateway: 'stripe',
      amount,
      currency,
      payment_intent_id: paymentIntent.id,
      status: 'pending',
      metadata: {
        customer_email: dto.customer_email,
        customer_name: dto.customer_name,
      },
    });

    this.logger.log(`Created payment ${payment.uuid} with PaymentIntent ${paymentIntent.id} for booking ${booking.booking_reference}`);

    return {
      payment_uuid: payment.uuid,
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount,
      currency,
      booking_reference: booking.booking_reference,
    };
  }

  /**
   * Get payment status
   * This method also serves as a fallback to trigger invoice generation
   * if the Stripe webhook failed or was delayed
   */
  async getPaymentStatus(paymentUuid: string) {
    const payment = await this.paymentsRepository.findOne({
      where: { uuid: paymentUuid },
      include: [
        {
          model: Bookings,
          as: 'booking',
          include: [
            { model: WeddingGroups, as: 'wedding_group' },
          ],
        },
      ],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Get latest status from Stripe if payment is not yet successful
    // Also re-check failed payments in case Stripe succeeded but we missed it
    if (payment.status === 'pending' || payment.status === 'processing' || payment.status === 'failed') {
      if (payment.payment_intent_id) {
        const paymentIntent = await this.stripeService.retrievePaymentIntent(payment.payment_intent_id);
        this.logger.log(`Payment ${payment.uuid} - Stripe status: ${paymentIntent.status}, Local status: ${payment.status}`);

        // Update local status based on Stripe status
        let newStatus = payment.status;
        if (paymentIntent.status === 'succeeded') {
          newStatus = 'success';
        } else if (paymentIntent.status === 'processing') {
          newStatus = 'processing';
        } else if (paymentIntent.status === 'canceled' || paymentIntent.status === 'requires_payment_method') {
          newStatus = 'failed';
        }

        if (newStatus !== payment.status) {
          this.logger.log(`Payment ${payment.uuid} - Updating status from ${payment.status} to ${newStatus}`);
          await this.updatePaymentStatus(payment, newStatus as any);
          // Refresh payment object with new status
          payment.status = newStatus as any;
        }
      }
    }

    // FALLBACK: If payment succeeded but invoice wasn't generated (webhook might have failed)
    // Try to generate the invoice now
    if (payment.status === 'success' && !payment.invoice_generated) {
      this.logger.log(`Payment ${payment.uuid} succeeded but invoice not generated - triggering fallback invoice generation`);
      await this.generateInvoiceAndSendEmail(payment);
    }

    return {
      uuid: payment.uuid,
      status: payment.status,
      payment_type: payment.payment_type,
      amount: payment.amount,
      currency: payment.currency,
      booking_reference: payment.booking?.booking_reference,
      paid_at: payment.paid_at,
      invoice_generated: payment.invoice_generated,
      invoice_generated_at: payment.invoice_generated_at,
    };
  }

  /**
   * Retry invoice generation for a payment that succeeded but invoice wasn't created
   * Can be called manually via admin or by the cron job
   */
  async retryInvoiceGeneration(paymentUuid: string): Promise<{ success: boolean; message: string }> {
    const payment = await this.paymentsRepository.findOne({
      where: { uuid: paymentUuid },
      include: [{ model: Bookings, as: 'booking' }],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'success') {
      return { success: false, message: 'Payment is not successful, cannot generate invoice' };
    }

    if (payment.invoice_generated) {
      return { success: false, message: 'Invoice already generated for this payment' };
    }

    const result = await this.generateInvoiceAndSendEmail(payment);
    return result;
  }

  /**
   * Get payments that succeeded but don't have invoices generated
   * Used by the cron job to find and process missing invoices
   */
  async getPaymentsWithMissingInvoices(): Promise<Payments[]> {
    return this.paymentsRepository.findAll({
      where: {
        status: 'success',
        invoice_generated: false,
        invoice_generation_attempts: { [require('sequelize').Op.lt]: 5 }, // Max 5 attempts
      },
      include: [{ model: Bookings, as: 'booking' }],
      order: [['paid_at', 'ASC']],
      limit: 50, // Process in batches
    });
  }

  /**
   * Process all payments with missing invoices (called by cron)
   */
  async processMissingInvoices(): Promise<{ processed: number; succeeded: number; failed: number }> {
    const payments = await this.getPaymentsWithMissingInvoices();
    let succeeded = 0;
    let failed = 0;

    for (const payment of payments) {
      try {
        const result = await this.generateInvoiceAndSendEmail(payment);
        if (result.success) {
          succeeded++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        this.logger.error(`Failed to process missing invoice for payment ${payment.uuid}: ${error.message}`);
      }
    }

    return { processed: payments.length, succeeded, failed };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhookEvent(event: any) {
    this.logger.log(`Processing Stripe webhook event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object);
        break;
      case 'payment_intent.canceled':
        await this.handlePaymentIntentCanceled(event.data.object);
        break;
      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object);
        break;
      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentIntentSucceeded(paymentIntent: any) {
    const payment = await this.paymentsRepository.findOne({
      where: { payment_intent_id: paymentIntent.id },
      include: [
        {
          model: Bookings,
          as: 'booking',
          include: [
            { model: Guests, as: 'guest' },
            { model: WeddingGroups, as: 'wedding_group' },
          ],
        },
      ],
    });

    if (!payment) {
      this.logger.warn(`Payment not found for PaymentIntent ${paymentIntent.id}`);
      return;
    }

    await this.updatePaymentStatus(payment, 'success');

    // Update transaction_id from charge
    if (paymentIntent.latest_charge) {
      payment.transaction_id = paymentIntent.latest_charge;
      await payment.save();
    }

    this.logger.log(`Payment ${payment.uuid} succeeded for booking ${payment.booking?.booking_reference}`);

    // Emit payment.succeeded event for N8N webhooks
    this.eventsService.emit(EventType.PAYMENT_SUCCEEDED, {
      payment_uuid: payment.uuid,
      payment_type: payment.payment_type,
      amount: Number(payment.amount),
      currency: payment.currency,
      booking: payment.booking ? {
        booking_reference: payment.booking.booking_reference,
        booking_uuid: payment.booking.uuid,
        status: payment.booking.status,
      } : null,
      guest: payment.booking?.guest ? {
        name: payment.booking.guest.name,
        email: payment.booking.guest.email,
        phone: payment.booking.guest.phone,
      } : null,
      wedding: payment.booking?.wedding_group ? {
        name: payment.booking.wedding_group.name,
        slug: payment.booking.wedding_group.booking_link,
      } : null,
      paid_at: payment.paid_at?.toISOString(),
    }).catch((error) => {
      this.logger.error(`Failed to emit payment.succeeded event: ${error.message}`);
    });
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentIntentFailed(paymentIntent: any) {
    const payment = await this.paymentsRepository.findOne({
      where: { payment_intent_id: paymentIntent.id },
      include: [
        {
          model: Bookings,
          as: 'booking',
          include: [
            { model: Guests, as: 'guest' },
            { model: WeddingGroups, as: 'wedding_group' },
          ],
        },
      ],
    });

    if (!payment) {
      this.logger.warn(`Payment not found for PaymentIntent ${paymentIntent.id}`);
      return;
    }

    payment.status = 'failed';
    payment.failure_reason = paymentIntent.last_payment_error?.message || 'Payment failed';
    await payment.save();

    this.logger.log(`Payment ${payment.uuid} failed: ${payment.failure_reason}`);

    // Emit payment.failed event for N8N webhooks
    this.eventsService.emit(EventType.PAYMENT_FAILED, {
      payment_uuid: payment.uuid,
      payment_type: payment.payment_type,
      amount: Number(payment.amount),
      currency: payment.currency,
      failure_reason: payment.failure_reason,
      booking: payment.booking ? {
        booking_reference: payment.booking.booking_reference,
        booking_uuid: payment.booking.uuid,
        status: payment.booking.status,
      } : null,
      guest: payment.booking?.guest ? {
        name: payment.booking.guest.name,
        email: payment.booking.guest.email,
        phone: payment.booking.guest.phone,
      } : null,
      wedding: payment.booking?.wedding_group ? {
        name: payment.booking.wedding_group.name,
        slug: payment.booking.wedding_group.booking_link,
      } : null,
    }).catch((error) => {
      this.logger.error(`Failed to emit payment.failed event: ${error.message}`);
    });
  }

  /**
   * Handle canceled payment
   */
  private async handlePaymentIntentCanceled(paymentIntent: any) {
    const payment = await this.paymentsRepository.findOne({
      where: { payment_intent_id: paymentIntent.id },
    });

    if (!payment) {
      return;
    }

    payment.status = 'failed';
    payment.failure_reason = 'Payment was canceled';
    await payment.save();

    this.logger.log(`Payment ${payment.uuid} canceled`);
  }

  /**
   * Handle refund
   */
  private async handleChargeRefunded(charge: any) {
    // Find payment by transaction_id (charge id)
    const payment = await this.paymentsRepository.findOne({
      where: { transaction_id: charge.id },
    });

    if (!payment) {
      // Try finding by payment_intent_id
      if (charge.payment_intent) {
        const paymentByIntent = await this.paymentsRepository.findOne({
          where: { payment_intent_id: charge.payment_intent },
        });
        if (paymentByIntent) {
          paymentByIntent.status = 'refunded';
          await paymentByIntent.save();
          this.logger.log(`Payment ${paymentByIntent.uuid} marked as refunded`);
        }
      }
      return;
    }

    payment.status = 'refunded';
    await payment.save();
    this.logger.log(`Payment ${payment.uuid} marked as refunded`);
  }

  /**
   * Update payment status and booking status if needed
   */
  private async updatePaymentStatus(payment: Payments, status: 'success' | 'failed' | 'processing' | 'refunded') {
    payment.status = status;

    if (status === 'success') {
      payment.paid_at = new Date();

      // Update booking status and paid_at timestamps
      if (payment.booking) {
        if (payment.payment_type === 'deposit') {
          payment.booking.status = 'deposit_paid';
          payment.booking.deposit_paid_at = new Date();
        } else if (payment.payment_type === 'final') {
          payment.booking.status = 'confirmed';
          payment.booking.final_paid_at = new Date();
          payment.booking.confirmed_at = new Date();
        }
        await payment.booking.save();
        this.logger.log(`Booking ${payment.booking.booking_reference} status updated to ${payment.booking.status}`);

        // Generate invoice and send confirmation email
        await this.generateInvoiceAndSendEmail(payment);

        // Emit payment.succeeded event for N8N webhooks
        // Load full data if not already loaded
        const fullPayment = await this.paymentsRepository.findOne({
          where: { id: payment.id },
          include: [
            {
              model: Bookings,
              as: 'booking',
              include: [
                { model: Guests, as: 'guest' },
                { model: WeddingGroups, as: 'wedding_group' },
              ],
            },
          ],
        });

        if (fullPayment) {
          this.eventsService.emit(EventType.PAYMENT_SUCCEEDED, {
            payment_uuid: fullPayment.uuid,
            payment_type: fullPayment.payment_type,
            amount: Number(fullPayment.amount),
            currency: fullPayment.currency,
            booking: fullPayment.booking ? {
              booking_reference: fullPayment.booking.booking_reference,
              booking_uuid: fullPayment.booking.uuid,
              status: fullPayment.booking.status,
            } : null,
            guest: fullPayment.booking?.guest ? {
              name: fullPayment.booking.guest.name,
              email: fullPayment.booking.guest.email,
              phone: fullPayment.booking.guest.phone,
            } : null,
            wedding: fullPayment.booking?.wedding_group ? {
              name: fullPayment.booking.wedding_group.name,
              slug: fullPayment.booking.wedding_group.booking_link,
            } : null,
            paid_at: fullPayment.paid_at?.toISOString(),
          }).catch((error) => {
            this.logger.error(`Failed to emit payment.succeeded event: ${error.message}`);
          });
        }
      }
    }

    await payment.save();
  }

  /**
   * Generate invoice for payment and send confirmation email
   * This method is idempotent - safe to call multiple times for the same payment
   */
  private async generateInvoiceAndSendEmail(payment: Payments): Promise<{ success: boolean; message: string }> {
    // IDEMPOTENCY CHECK: If invoice already generated, skip
    if (payment.invoice_generated) {
      this.logger.log(`Invoice already generated for payment ${payment.uuid}, skipping`);
      return { success: true, message: 'Invoice already generated' };
    }

    // Increment attempt counter
    payment.invoice_generation_attempts = (payment.invoice_generation_attempts || 0) + 1;
    await payment.save();

    // Check if max attempts reached
    if (payment.invoice_generation_attempts > 5) {
      const errorMsg = `Max invoice generation attempts (5) reached for payment ${payment.uuid}`;
      this.logger.error(errorMsg);
      payment.invoice_generation_error = errorMsg;
      await payment.save();
      return { success: false, message: errorMsg };
    }

    try {
      // Ensure booking is loaded
      if (!payment.booking) {
        const paymentWithBooking = await this.paymentsRepository.findOne({
          where: { uuid: payment.uuid },
          include: [{ model: Bookings, as: 'booking' }],
        });
        if (!paymentWithBooking || !paymentWithBooking.booking) {
          throw new Error('Booking not found for payment');
        }
        payment.booking = paymentWithBooking.booking;
      }

      // Determine invoice type based on payment type
      const invoiceType = payment.payment_type === 'deposit' ? 'deposit' : 'final';

      // Generate invoice for the booking
      const invoice = await this.invoicesService.generateInvoice(
        payment.booking.uuid,
        {
          invoice_type: invoiceType as any,
          auto_issue: true,
        },
      );

      this.logger.log(`Invoice ${invoice.invoice_number} generated for booking ${payment.booking.booking_reference}`);

      // Link payment to invoice
      await this.invoicesService.markAsPaid(invoice.uuid, {
        payment_uuid: payment.uuid,
      });

      this.logger.log(`Invoice ${invoice.invoice_number} marked as paid`);

      // Mark invoice as generated BEFORE sending email (email is not critical)
      payment.invoice_generated = true;
      payment.invoice_generated_at = new Date();
      payment.invoice_generation_error = null;
      await payment.save();

      // Send confirmation email with invoice attachment
      try {
        const emailResult = await this.invoiceEmailService.sendInvoiceEmail(invoice.uuid, {
          includePdfAttachment: true,
          customMessage: this.getConfirmationMessage(payment.payment_type),
        });
        this.logger.log(`Confirmation email sent: ${emailResult.message}`);
      } catch (emailError) {
        // Log email error but don't fail - invoice was generated successfully
        this.logger.error(`Failed to send confirmation email: ${emailError.message}`);
      }

      // Send final payment confirmation email (with contacts) for final payments only
      if (payment.payment_type === 'final') {
        try {
          await this.sendFinalPaymentConfirmationEmail(payment, invoice.invoice_number);
        } catch (finalEmailError) {
          // Log error but don't fail - invoice was generated successfully
          this.logger.error(`Failed to send final payment confirmation email: ${finalEmailError.message}`);
        }
      }

      return { success: true, message: `Invoice ${invoice.invoice_number} generated successfully` };
    } catch (error) {
      // Log invoice error and save to payment record
      const errorMsg = `Failed to generate invoice: ${error.message}`;
      this.logger.error(errorMsg);
      payment.invoice_generation_error = errorMsg;
      await payment.save();
      return { success: false, message: errorMsg };
    }
  }

  /**
   * Get confirmation message based on payment type
   */
  private getConfirmationMessage(paymentType: string): string {
    if (paymentType === 'deposit') {
      return 'Your deposit payment has been successfully processed! Your booking is now secured. Please find your invoice attached. You will receive a reminder when your final payment is due.';
    }
    return 'Your final payment has been successfully processed! Your booking is now confirmed. Please find your invoice attached. We look forward to welcoming you!';
  }

  /**
   * Send final payment confirmation email with contact details
   */
  private async sendFinalPaymentConfirmationEmail(payment: Payments, invoiceNumber: string): Promise<void> {
    // Load full booking data with all relations
    const booking = await this.bookingsRepository.findOne({
      where: { id: payment.booking_id },
      include: [
        { model: Guests, as: 'guest' },
        {
          model: WeddingGroups,
          as: 'wedding_group',
          include: [{ model: Hotels, as: 'hotel' }],
        },
      ],
    });

    if (!booking || !booking.guest || !booking.wedding_group) {
      this.logger.warn(`Cannot send final payment confirmation - missing booking data for payment ${payment.uuid}`);
      return;
    }

    const wedding = booking.wedding_group;
    const guest = booking.guest;
    const hotel = (wedding as any).hotel;

    // Get deposit payment to calculate deposit amount
    const depositPayment = await this.paymentsRepository.findOne({
      where: {
        booking_id: booking.id,
        payment_type: 'deposit',
        status: 'success',
      },
    });

    const depositAmount = depositPayment ? Number(depositPayment.amount) : 0;
    const finalPaymentAmount = Number(payment.amount);
    const totalAmount = depositAmount + finalPaymentAmount;

    // Calculate total nights
    const checkIn = new Date(booking.check_in_date);
    const checkOut = new Date(booking.check_out_date);
    const totalNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    const emailData: FinalPaymentConfirmationData = {
      // Guest Info
      guestName: guest.name,
      guestEmail: guest.email,
      guestAccessToken: guest.access_token,

      // Booking Info
      bookingReference: booking.booking_reference,
      checkInDate: booking.check_in_date,
      checkOutDate: booking.check_out_date,
      totalNights,
      totalAdults: booking.total_adults || 2,
      totalChildren: booking.total_children || 0,

      // Wedding/Event Info
      weddingName: wedding.name,
      brideName: wedding.bride_name,
      groomName: wedding.groom_name,

      // Contact Info
      brideEmail: wedding.bride_email,
      bridePhone: wedding.bride_phone,
      groomEmail: wedding.groom_email,
      groomPhone: wedding.groom_phone,
      hotelContactName: wedding.hotel_contact_name,
      hotelContactEmail: wedding.hotel_contact_email,
      hotelContactPhone: wedding.hotel_contact_phone,

      // Hotel Info
      hotelName: hotel?.name || 'Hotel',
      hotelCity: hotel?.city || '',
      hotelCountry: hotel?.country || '',
      hotelAddress: hotel?.address,

      // Invoice Info
      invoiceNumber,
      paymentDate: new Date().toISOString(),

      // Payment Info
      finalPaymentAmount,
      depositAmount,
      totalAmount,
      currency: payment.currency || 'USD',
    };

    const result = await this.bookingConfirmationEmailService.sendFinalPaymentConfirmationEmail(emailData);

    if (result.success) {
      this.logger.log(`Final payment confirmation email sent for ${booking.booking_reference}`);
    } else {
      this.logger.warn(`Failed to send final payment confirmation email: ${result.message}`);
    }
  }

  /**
   * Get Stripe publishable key for frontend
   */
  getPublishableKey(): string {
    return this.stripeService.getPublishableKey();
  }
}
