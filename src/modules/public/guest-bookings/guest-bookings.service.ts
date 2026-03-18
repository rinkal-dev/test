/**
 * ============================================
 * GUEST BOOKINGS SERVICE
 * ============================================
 *
 * Service for guest booking management including
 * cancellation and refund requests.
 */

import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Op, Sequelize } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { MailerService } from '@nestjs-modules/mailer';
import {
  PAYMENTS_REPOSITORY,
  BOOKINGS_REPOSITORY,
  WEDDING_GROUPS_REPOSITORY,
  REFUNDS_REPOSITORY,
} from 'src/config/constants';
import {
  Payments,
  Bookings,
  WeddingGroups,
  Guests,
  Hotels,
  Refunds,
  BookingRooms,
} from 'src/models';
import { CancellationPoliciesService } from 'src/modules/admin/cancellation-policies/cancellation-policies.service';
import { EventsService } from 'src/modules/events/events.service';
import { EventType } from 'src/modules/events/event-types';
import { GuestRefundRequestDto } from './dto/GuestRefundRequestDto';
import { UpdateRoommateOptInDto } from './dto/UpdateRoommateOptInDto';
import { SendRoommateMessageDto } from './dto/SendRoommateMessageDto';
import { RefundNotificationService } from './refund-notification.service';
import { getEnvironmentData } from 'src/helpers/general';

@Injectable()
export class GuestBookingsService {
  private readonly logger = new Logger(GuestBookingsService.name);

  constructor(
    @Inject(PAYMENTS_REPOSITORY) private paymentsRepository: typeof Payments,
    @Inject(BOOKINGS_REPOSITORY) private bookingsRepository: typeof Bookings,
    @Inject(WEDDING_GROUPS_REPOSITORY) private weddingGroupsRepository: typeof WeddingGroups,
    @Inject(REFUNDS_REPOSITORY) private refundsRepository: typeof Refunds,
    private readonly cancellationPoliciesService: CancellationPoliciesService,
    private readonly eventsService: EventsService,
    private readonly refundNotificationService: RefundNotificationService,
    private readonly mailerService: MailerService,
  ) {}

  /**
   * Get guest's bookings with payment status
   */
  async getGuestBookings(guestId: number) {
    const bookings = await this.bookingsRepository.findAll({
      where: { guest_id: guestId },
      include: [
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: ['uuid', 'name', 'event_start_date', 'event_end_date'],
          include: [
            {
              model: Hotels,
              as: 'hotel',
              attributes: ['uuid', 'name', 'address', 'city', 'country'],
            },
          ],
        },
        {
          model: BookingRooms,
          as: 'booking_rooms',
          attributes: ['uuid', 'room_type_name', 'quantity', 'rate_per_night'],
        },
        {
          model: Payments,
          as: 'payments',
          attributes: ['uuid', 'payment_type', 'amount', 'status', 'paid_at'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return bookings.map((booking) => this.formatBookingForGuest(booking));
  }

  /**
   * Get cancellation preview - shows guest what they would receive
   */
  async getCancellationPreview(guestId: number, bookingUuid: string) {
    const booking = await this.bookingsRepository.findOne({
      where: { uuid: bookingUuid, guest_id: guestId },
      include: [
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: ['id', 'uuid', 'name', 'event_start_date'],
        },
        {
          model: Payments,
          as: 'payments',
          where: { status: 'success' },
          required: false,
        },
      ],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check if booking can be cancelled
    if (!['pending', 'deposit_paid', 'confirmed'].includes(booking.status)) {
      throw new BadRequestException(
        `Booking cannot be cancelled. Current status: ${booking.status}`,
      );
    }

    // Check if there's already a pending refund
    const existingRefund = await this.refundsRepository.findOne({
      where: {
        booking_id: booking.id,
        status: { [Op.in]: ['pending', 'approved', 'processing'] },
      },
    });

    if (existingRefund) {
      throw new ConflictException(
        'A refund request is already pending for this booking',
      );
    }

    // Calculate total paid amount
    const totalPaid = booking.payments?.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    ) || 0;

    if (totalPaid === 0) {
      return {
        booking_uuid: booking.uuid,
        booking_reference: booking.booking_reference,
        total_paid: 0,
        refund_amount: 0,
        refund_percentage: 100,
        days_until_event: null,
        policy_message: 'No payments have been made for this booking.',
        can_request_refund: false,
      };
    }

    // Get refund calculation based on cancellation policy
    const cancellationDate = new Date();
    const policyCalculation = await this.cancellationPoliciesService.calculateRefund(
      booking.wedding_group.id,
      cancellationDate,
      totalPaid,
    );

    return {
      booking_uuid: booking.uuid,
      booking_reference: booking.booking_reference,
      wedding_name: booking.wedding_group.name,
      event_date: booking.wedding_group.event_start_date,
      total_paid: totalPaid,
      refund_amount: policyCalculation.refund_amount,
      refund_percentage: policyCalculation.refund_percentage,
      penalty_amount: policyCalculation.non_refundable_amount,
      days_until_event: policyCalculation.days_until_event,
      policy_name: policyCalculation.applicable_policy?.description || 'Default Policy',
      policy_message: this.getPolicyMessage(policyCalculation),
      can_request_refund: policyCalculation.refund_percentage > 0,
    };
  }

  /**
   * Request a refund (creates PENDING refund request)
   */
  async requestRefund(guestId: number, dto: GuestRefundRequestDto) {
    // Get booking with payments
    const booking = await this.bookingsRepository.findOne({
      where: { uuid: dto.booking_uuid, guest_id: guestId },
      include: [
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: ['id', 'uuid', 'name', 'event_start_date'],
        },
        {
          model: Payments,
          as: 'payments',
          where: { status: 'success' },
          required: false,
        },
        {
          model: Guests,
          as: 'guest',
          attributes: ['uuid', 'name', 'email'],
        },
      ],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Validate booking status
    if (!['pending', 'deposit_paid', 'confirmed'].includes(booking.status)) {
      throw new BadRequestException(
        `Booking cannot be cancelled. Current status: ${booking.status}`,
      );
    }

    // Check for existing refund request
    const existingRefund = await this.refundsRepository.findOne({
      where: {
        booking_id: booking.id,
        status: { [Op.in]: ['pending', 'approved', 'processing'] },
      },
    });

    if (existingRefund) {
      throw new ConflictException(
        'A refund request is already pending for this booking',
      );
    }

    // Calculate total paid and get primary payment
    const successfulPayments = booking.payments || [];
    const totalPaid = successfulPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    if (totalPaid === 0) {
      throw new BadRequestException('No payments found for this booking');
    }

    // Calculate refund based on cancellation policy
    const cancellationDate = new Date();
    const policyCalculation = await this.cancellationPoliciesService.calculateRefund(
      booking.wedding_group.id,
      cancellationDate,
      totalPaid,
    );

    if (policyCalculation.refund_percentage === 0) {
      throw new BadRequestException(
        `Refund not allowed. Based on cancellation policy, you are ${policyCalculation.days_until_event} days before the event. No refund is permitted at this time.`,
      );
    }

    // Get the primary payment for gateway info (prefer deposit, fallback to first payment)
    const primaryPayment = successfulPayments.find(p => p.payment_type === 'deposit')
      || successfulPayments[0];

    // Create a SINGLE refund record for the total refund amount
    const refund = await this.refundsRepository.create({
      uuid: uuidv4(),
      booking_id: booking.id,
      payment_id: primaryPayment.id, // Link to primary payment for gateway processing
      refund_gateway: primaryPayment.payment_gateway,
      refund_type: policyCalculation.refund_percentage === 100 ? 'full' : 'partial',
      amount: policyCalculation.refund_amount,
      currency: primaryPayment.currency,
      reason: dto.reason,
      notes: `[Guest Request] ${dto.notes || ''}\n[Policy Applied] ${policyCalculation.refund_percentage}% refund allowed (${policyCalculation.days_until_event} days before event)`.trim(),
      status: 'pending',
      policy_refund_percentage: policyCalculation.refund_percentage,
      original_payment_amount: totalPaid,
      max_refundable_amount: policyCalculation.refund_amount,
    });

    const refunds = [refund];

    // Emit event for admin notification
    this.eventsService.emit(EventType.REFUND_REQUESTED, {
      booking_uuid: booking.uuid,
      booking_reference: booking.booking_reference,
      guest_name: booking.guest?.name,
      guest_email: booking.guest?.email,
      wedding_name: booking.wedding_group.name,
      total_refund_amount: policyCalculation.refund_amount,
      refund_percentage: policyCalculation.refund_percentage,
      reason: dto.reason,
      refund_uuids: refunds.map(r => r.uuid),
    });

    // Send email notification to admin
    await this.refundNotificationService.notifyAdminOfRefundRequest({
      guestName: booking.guest?.name || 'Guest',
      guestEmail: booking.guest?.email || '',
      bookingReference: booking.booking_reference,
      weddingName: booking.wedding_group.name,
      refundAmount: policyCalculation.refund_amount.toFixed(2),
      refundPercentage: policyCalculation.refund_percentage,
      reason: dto.reason,
    });

    // Send confirmation email to guest
    await this.refundNotificationService.notifyGuestOfRefundSubmission({
      guestName: booking.guest?.name || 'Guest',
      guestEmail: booking.guest?.email || '',
      bookingReference: booking.booking_reference,
      weddingName: booking.wedding_group.name,
      refundAmount: policyCalculation.refund_amount.toFixed(2),
      status: 'pending',
    });

    this.logger.log(
      `Guest refund request created for booking ${booking.booking_reference}. ` +
      `Total refund: $${policyCalculation.refund_amount} (${policyCalculation.refund_percentage}%)`,
    );

    return {
      success: true,
      message: 'Refund request submitted successfully. You will be notified once it is reviewed.',
      booking_reference: booking.booking_reference,
      refund_amount: policyCalculation.refund_amount,
      refund_percentage: policyCalculation.refund_percentage,
      status: 'pending',
    };
  }

  /**
   * Get refund request status for a booking
   */
  async getRefundStatus(guestId: number, bookingUuid: string) {
    const booking = await this.bookingsRepository.findOne({
      where: { uuid: bookingUuid, guest_id: guestId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const refunds = await this.refundsRepository.findAll({
      where: { booking_id: booking.id },
      order: [['created_at', 'DESC']],
    });

    if (refunds.length === 0) {
      return {
        has_refund_request: false,
        refunds: [],
      };
    }

    return {
      has_refund_request: true,
      refunds: refunds.map((refund) => ({
        uuid: refund.uuid,
        amount: Number(refund.amount),
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason,
        created_at: refund.created_at,
        processed_at: refund.processed_at,
        failure_reason: refund.failure_reason,
      })),
    };
  }

  /**
   * Format booking for guest response
   */
  private formatBookingForGuest(booking: Bookings) {
    const payments = booking.payments || [];
    const depositPayment = payments.find(p => p.payment_type === 'deposit');
    const finalPayment = payments.find(p => p.payment_type === 'final');

    return {
      uuid: booking.uuid,
      booking_reference: booking.booking_reference,
      status: booking.status,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      nights: booking.total_nights,
      adults: booking.total_adults,
      children: booking.total_children,
      total_rooms: booking.total_rooms,
      total_amount: Number(booking.total_amount),
      deposit_amount: Number(booking.deposit_amount),
      currency: booking.currency,
      special_requests: booking.special_requests,
      wedding: booking.wedding_group
        ? {
            uuid: booking.wedding_group.uuid,
            name: booking.wedding_group.name,
            event_start_date: booking.wedding_group.event_start_date,
            event_end_date: booking.wedding_group.event_end_date,
            hotel: booking.wedding_group.hotel
              ? {
                  name: booking.wedding_group.hotel.name,
                  address: booking.wedding_group.hotel.address,
                  city: booking.wedding_group.hotel.city,
                  country: booking.wedding_group.hotel.country,
                }
              : null,
          }
        : null,
      rooms: booking.booking_rooms?.map((room: any) => ({
        name: room.room_type_name,
        quantity: room.quantity,
        rate_per_night: Number(room.rate_per_night),
      })) || [],
      payment_status: {
        deposit_paid: depositPayment?.status === 'success',
        deposit_amount: depositPayment ? Number(depositPayment.amount) : null,
        deposit_paid_at: depositPayment?.paid_at,
        final_paid: finalPayment?.status === 'success',
        final_amount: finalPayment ? Number(finalPayment.amount) : null,
        final_paid_at: finalPayment?.paid_at,
      },
      can_cancel: ['pending', 'deposit_paid', 'confirmed'].includes(booking.status),
      roommate_opt_in: booking.roommate_opt_in || false,
      roommate_note: booking.roommate_note || null,
      created_at: booking.created_at,
    };
  }

  /**
   * Generate user-friendly policy message
   */
  private getPolicyMessage(calculation: any): string {
    const { refund_percentage, days_until_event, non_refundable_amount } = calculation;

    if (refund_percentage === 100) {
      return `Full refund available. You are ${days_until_event} days before the event.`;
    } else if (refund_percentage > 0) {
      return `${refund_percentage}% refund available (${days_until_event} days before event). ` +
        `A cancellation fee of $${non_refundable_amount.toFixed(2)} will apply.`;
    } else {
      return `No refund available. You are ${days_until_event} days before the event. ` +
        `Based on the cancellation policy, refunds are no longer permitted.`;
    }
  }

  /**
   * Update roommate opt-in status for a booking
   * Solo Traveler Connection feature
   */
  async updateRoommateOptIn(
    guestId: number,
    bookingUuid: string,
    dto: UpdateRoommateOptInDto,
  ): Promise<{ roommate_opt_in: boolean; roommate_note: string | null }> {
    const booking = await this.bookingsRepository.findOne({
      where: { uuid: bookingUuid, guest_id: guestId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Only active bookings can opt-in
    if (!['pending', 'deposit_paid', 'confirmed'].includes(booking.status)) {
      throw new BadRequestException('Cannot update roommate opt-in for this booking status');
    }

    // Update the booking
    booking.roommate_opt_in = dto.roommate_opt_in;
    booking.roommate_note = dto.roommate_opt_in ? (dto.roommate_note || null) : null;
    await booking.save();

    this.logger.log(
      `Roommate opt-in updated for booking ${booking.booking_reference}: ${dto.roommate_opt_in}`,
    );

    return {
      roommate_opt_in: booking.roommate_opt_in,
      roommate_note: booking.roommate_note,
    };
  }

  /**
   * Get list of other opted-in guests in the same wedding group
   * Only returns data if the requesting guest has also opted-in
   */
  async getRoommateConnections(
    guestId: number,
    bookingUuid: string,
  ): Promise<{
    is_opted_in: boolean;
    connections: Array<{
      guest_name: string;
      guest_email: string;
      roommate_note: string | null;
      check_in: string;
      check_out: string;
    }>;
  }> {
    // Get the requesting guest's booking
    const myBooking = await this.bookingsRepository.findOne({
      where: { uuid: bookingUuid, guest_id: guestId },
      include: [
        {
          model: Guests,
          as: 'guest',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    if (!myBooking) {
      throw new NotFoundException('Booking not found');
    }

    // If not opted-in, return empty list (privacy protection)
    if (!myBooking.roommate_opt_in) {
      return {
        is_opted_in: false,
        connections: [],
      };
    }

    // Get all other opted-in bookings in the same wedding group
    const optedInBookings = await this.bookingsRepository.findAll({
      attributes: ['id', 'uuid', 'roommate_note', 'check_in_date', 'check_out_date'],
      where: {
        wedding_group_id: myBooking.wedding_group_id,
        roommate_opt_in: true,
        guest_id: { [Op.ne]: guestId }, // Exclude requesting guest
        status: ['pending', 'deposit_paid', 'confirmed'], // Only active bookings
      },
      include: [
        {
          model: Guests,
          as: 'guest',
          attributes: ['name', 'email'],
        },
      ],
      order: [['check_in_date', 'ASC']],
    });

    return {
      is_opted_in: true,
      connections: optedInBookings.map((booking) => ({
        booking_uuid: booking.uuid,
        guest_name: booking.guest?.name || 'Guest',
        guest_email: booking.guest?.email || '',
        roommate_note: booking.roommate_note,
        check_in: booking.check_in_date,
        check_out: booking.check_out_date,
      })),
    };
  }

  /**
   * Send a message to another opted-in guest
   * Message is sent via email, keeping the recipient's email private
   */
  async sendRoommateMessage(
    guestId: number,
    bookingUuid: string,
    dto: SendRoommateMessageDto,
  ): Promise<{ success: boolean; recipient_name: string }> {
    // Get sender's booking with guest info
    const senderBooking = await this.bookingsRepository.findOne({
      where: { uuid: bookingUuid, guest_id: guestId },
      include: [
        {
          model: Guests,
          as: 'guest',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: ['id', 'name', 'bride_name', 'groom_name'],
        },
      ],
    });

    if (!senderBooking) {
      throw new NotFoundException('Booking not found');
    }

    // Check if sender is opted-in
    if (!senderBooking.roommate_opt_in) {
      throw new BadRequestException('You must opt-in to solo traveler connections to send messages');
    }

    // Get recipient's booking
    const recipientBooking = await this.bookingsRepository.findOne({
      where: { uuid: dto.recipient_booking_uuid },
      include: [
        {
          model: Guests,
          as: 'guest',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    if (!recipientBooking) {
      throw new NotFoundException('Recipient not found');
    }

    // Verify recipient is in same wedding group and opted-in
    if (recipientBooking.wedding_group_id !== senderBooking.wedding_group_id) {
      throw new BadRequestException('Recipient is not in the same wedding group');
    }

    if (!recipientBooking.roommate_opt_in) {
      throw new BadRequestException('Recipient is no longer accepting messages');
    }

    // Prepare email context
    const appName = getEnvironmentData('APP_NAME') || 'DestaPay';
    const logoUrl = getEnvironmentData('APP_LOGO_URL') || '';
    const frontendUrl = getEnvironmentData('FRONTEND_URL') || getEnvironmentData('APP_URL') || '';
    const weddingGroup = senderBooking.wedding_group;
    const coupleName = `${weddingGroup?.bride_name || ''} & ${weddingGroup?.groom_name || ''}`;

    const context = {
      appName,
      logoUrl,
      currentYear: new Date().getFullYear(),
      recipientName: recipientBooking.guest?.name || 'Guest',
      senderName: senderBooking.guest?.name || 'A fellow guest',
      senderEmail: senderBooking.guest?.email,
      coupleName,
      weddingGroupName: weddingGroup?.name || coupleName + "'s Wedding",
      message: dto.message,
      myBookingUrl: `${frontendUrl}/my-booking`,
    };

    try {
      await this.mailerService.sendMail({
        to: recipientBooking.guest?.email,
        replyTo: senderBooking.guest?.email, // So recipient can reply directly
        subject: `Message from ${context.senderName} | ${context.weddingGroupName} - Solo Traveler Connection`,
        template: 'roommate-message',
        context,
      });

      this.logger.log(
        `Roommate message sent from ${senderBooking.guest?.email} to ${recipientBooking.guest?.email}`,
      );

      return {
        success: true,
        recipient_name: recipientBooking.guest?.name || 'Guest',
      };
    } catch (error) {
      this.logger.error(`Failed to send roommate message: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to send message. Please try again.');
    }
  }
}
