import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
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
  CANCELLATION_POLICIES_REPOSITORY,
} from 'src/config/constants';
import { Payments, Bookings, WeddingGroups, Guests, Hotels, Refunds, Admins, CancellationPolicies } from 'src/models';
import { CreatePaymentDto, PaymentStatus } from './dto/CreatePaymentDto';
import { UpdatePaymentDto } from './dto/UpdatePaymentDto';
import { PaymentQueryDto } from './dto/PaymentQueryDto';
import { CreateRefundDto, RefundType } from './dto/CreateRefundDto';
import { RefundQueryDto } from './dto/RefundQueryDto';
import { ApproveRefundDto, DenyRefundDto, ProcessRefundDto } from './dto/ProcessRefundDto';
import { StripeService } from 'src/modules/public/payments/stripe.service';
import { CancellationPoliciesService } from 'src/modules/admin/cancellation-policies/cancellation-policies.service';
import { EventsService } from 'src/modules/events/events.service';
import { EventType } from 'src/modules/events/event-types';
import { RefundNotificationService } from 'src/modules/public/guest-bookings/refund-notification.service';
import { getEnvironmentData } from 'src/helpers/general';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @Inject(PAYMENTS_REPOSITORY) private paymentsRepository: typeof Payments,
    @Inject(BOOKINGS_REPOSITORY) private bookingsRepository: typeof Bookings,
    @Inject(WEDDING_GROUPS_REPOSITORY) private weddingGroupsRepository: typeof WeddingGroups,
    @Inject(REFUNDS_REPOSITORY) private refundsRepository: typeof Refunds,
    @Inject(CANCELLATION_POLICIES_REPOSITORY) private cancellationPoliciesRepository: typeof CancellationPolicies,
    private readonly stripeService: StripeService,
    private readonly cancellationPoliciesService: CancellationPoliciesService,
    private readonly eventsService: EventsService,
    private readonly refundNotificationService: RefundNotificationService,
    private readonly mailerService: MailerService,
  ) {}

  // Get all payments with pagination and filters
  async getAllPayments(queries: PaymentQueryDto, filterAdminId?: number | null) {
    const page = Number(queries.page) || 1;
    const limit = Number(queries.limit) || 10;
    const offset = (page - 1) * limit;

    const where: any = {};
    const bookingWhere: any = {};
    const weddingGroupWhere: any = {};

    // Data-level filtering: Filter by wedding group owner
    if (filterAdminId !== null && filterAdminId !== undefined) {
      weddingGroupWhere.created_by = filterAdminId;
    }

    // Filter by booking
    if (queries.booking_uuid) {
      const booking = await this.bookingsRepository.findOne({
        where: { uuid: queries.booking_uuid },
      });
      if (booking) {
        where.booking_id = booking.id;
      }
    }

    // Filter by wedding group
    if (queries.wedding_group_uuid) {
      const group = await this.weddingGroupsRepository.findOne({
        where: { uuid: queries.wedding_group_uuid },
      });
      if (group) {
        bookingWhere.wedding_group_id = group.id;
      }
    }

    // Filter by payment type
    if (queries.payment_type) {
      where.payment_type = queries.payment_type;
    }

    // Filter by gateway
    if (queries.payment_gateway) {
      where.payment_gateway = queries.payment_gateway;
    }

    // Filter by status
    if (queries.status) {
      where.status = queries.status;
    }

    // Filter by date range
    if (queries.date_from || queries.date_to) {
      where.created_at = {};
      if (queries.date_from) {
        where.created_at[Op.gte] = new Date(queries.date_from);
      }
      if (queries.date_to) {
        where.created_at[Op.lte] = new Date(queries.date_to + 'T23:59:59');
      }
    }

    // Search by booking reference or transaction ID
    if (queries.search) {
      where[Op.or] = [
        { transaction_id: { [Op.iLike]: `%${queries.search}%` } },
        { payment_intent_id: { [Op.iLike]: `%${queries.search}%` } },
        { '$booking.booking_reference$': { [Op.iLike]: `%${queries.search}%` } },
      ];
    }

    const sortBy = queries.sort_by || 'created_at';
    const sortOrder = queries.sort_order || 'DESC';

    // Determine if includes should be required (for filtering)
    const hasBookingWhere = Object.keys(bookingWhere).length > 0;
    const hasWeddingGroupWhere = Object.keys(weddingGroupWhere).length > 0;

    return await this.paymentsRepository.findAndCountAll({
      where,
      include: [
        {
          model: Bookings,
          as: 'booking',
          where: hasBookingWhere ? bookingWhere : undefined,
          required: hasBookingWhere || hasWeddingGroupWhere, // Required if filtering by booking or wedding group
          attributes: ['uuid', 'booking_reference', 'total_amount', 'deposit_amount', 'status'],
          include: [
            {
              model: Guests,
              as: 'guest',
              attributes: ['uuid', 'name', 'email'],
            },
            {
              model: WeddingGroups,
              as: 'wedding_group',
              attributes: ['uuid', 'name', 'timezone', 'created_by'],
              where: hasWeddingGroupWhere ? weddingGroupWhere : undefined,
              required: hasWeddingGroupWhere, // Required if filtering by wedding group owner
              include: [
                {
                  model: Hotels,
                  as: 'hotel',
                  attributes: ['uuid', 'name'],
                },
              ],
            },
          ],
        },
      ],
      order: [[sortBy, sortOrder]],
      offset,
      limit,
    });
  }

  // Get payment by UUID
  async getPaymentByUuid(uuid: string, filterAdminId?: number | null) {
    const weddingGroupWhere: any = {};

    // Data-level filtering: Filter by wedding group owner
    if (filterAdminId !== null && filterAdminId !== undefined) {
      weddingGroupWhere.created_by = filterAdminId;
    }

    const hasWeddingGroupWhere = Object.keys(weddingGroupWhere).length > 0;

    const payment = await this.paymentsRepository.findOne({
      where: { uuid },
      include: [
        {
          model: Bookings,
          as: 'booking',
          required: hasWeddingGroupWhere, // Required if filtering by wedding group owner
          attributes: [
            'uuid',
            'booking_reference',
            'total_amount',
            'deposit_amount',
            'final_amount',
            'status',
            'check_in_date',
            'check_out_date',
          ],
          include: [
            {
              model: Guests,
              as: 'guest',
              attributes: ['uuid', 'name', 'email', 'phone'],
            },
            {
              model: WeddingGroups,
              as: 'wedding_group',
              attributes: ['uuid', 'name', 'timezone', 'bride_name', 'groom_name', 'created_by'],
              where: hasWeddingGroupWhere ? weddingGroupWhere : undefined,
              required: hasWeddingGroupWhere, // Required if filtering by wedding group owner
              include: [
                {
                  model: Hotels,
                  as: 'hotel',
                  attributes: ['uuid', 'name', 'address'],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  // Record a new payment
  async createPayment(createDto: CreatePaymentDto, filterAdminId?: number | null) {
    // Get booking with wedding group
    const booking = await this.bookingsRepository.findOne({
      where: { uuid: createDto.booking_uuid },
      include: [
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: ['id', 'created_by'],
        },
      ],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Data-level filtering: Check ownership
    if (filterAdminId !== null && filterAdminId !== undefined) {
      if (booking.wedding_group?.created_by !== filterAdminId) {
        throw new NotFoundException('Booking not found or you do not have access');
      }
    }

    // Validate payment amount
    if (createDto.payment_type === 'deposit') {
      if (Number(createDto.amount) > Number(booking.deposit_amount)) {
        throw new BadRequestException('Deposit amount exceeds required deposit');
      }
    } else if (createDto.payment_type === 'final') {
      if (Number(createDto.amount) > Number(booking.final_amount)) {
        throw new BadRequestException('Final payment amount exceeds remaining balance');
      }
    }

    const payment = await this.paymentsRepository.create({
      uuid: uuidv4(),
      booking_id: booking.id,
      payment_type: createDto.payment_type,
      payment_gateway: createDto.payment_gateway,
      amount: createDto.amount,
      currency: createDto.currency || booking.currency || 'USD',
      transaction_id: createDto.transaction_id,
      payment_intent_id: createDto.payment_intent_id,
      status: createDto.status || 'pending',
      metadata: createDto.metadata,
    });

    // If payment is successful, update booking status
    if (createDto.status === 'success') {
      await this.updateBookingOnPaymentSuccess(booking, createDto.payment_type);
      await this.paymentsRepository.update(
        { paid_at: new Date() },
        { where: { id: payment.id } },
      );

      // Emit payment.succeeded event
      this.eventsService.emit(EventType.PAYMENT_SUCCEEDED, {
        payment_uuid: payment.uuid,
        booking_uuid: booking.uuid,
        booking_reference: booking.booking_reference,
        amount: createDto.amount,
        currency: createDto.currency || booking.currency || 'USD',
        payment_type: createDto.payment_type,
        payment_gateway: createDto.payment_gateway,
        transaction_id: createDto.transaction_id,
      });
    } else if (createDto.status === 'failed') {
      // Emit payment.failed event
      this.eventsService.emit(EventType.PAYMENT_FAILED, {
        payment_uuid: payment.uuid,
        booking_uuid: booking.uuid,
        booking_reference: booking.booking_reference,
        amount: createDto.amount,
        currency: createDto.currency || booking.currency || 'USD',
        payment_type: createDto.payment_type,
        payment_gateway: createDto.payment_gateway,
        failure_reason: (createDto.metadata as any)?.failure_reason || 'Unknown',
      });
    }

    return await this.getPaymentByUuid(payment.uuid);
  }

  // Update payment
  async updatePayment(uuid: string, updateDto: UpdatePaymentDto, filterAdminId?: number | null) {
    const payment = await this.paymentsRepository.findOne({
      where: { uuid },
      include: [
        {
          model: Bookings,
          as: 'booking',
          include: [
            {
              model: WeddingGroups,
              as: 'wedding_group',
              attributes: ['id', 'created_by'],
            },
          ],
        },
      ],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Data-level filtering: Check ownership
    if (filterAdminId !== null && filterAdminId !== undefined) {
      if (payment.booking?.wedding_group?.created_by !== filterAdminId) {
        throw new NotFoundException('Payment not found or you do not have access');
      }
    }

    const updateData: any = { ...updateDto };

    // If marking as success, set paid_at
    if (updateDto.status === 'success' && payment.status !== 'success') {
      updateData.paid_at = new Date();

      // Update booking status
      await this.updateBookingOnPaymentSuccess(payment.booking, payment.payment_type);
    }

    await this.paymentsRepository.update(updateData, { where: { uuid } });

    return await this.getPaymentByUuid(uuid);
  }

  // Update booking status when payment succeeds
  private async updateBookingOnPaymentSuccess(booking: Bookings, paymentType: string) {
    if (paymentType === 'deposit' && booking.status === 'pending') {
      await this.bookingsRepository.update(
        {
          status: 'deposit_paid',
          deposit_paid_at: new Date(),
        },
        { where: { id: booking.id } },
      );
    } else if (paymentType === 'final') {
      await this.bookingsRepository.update(
        {
          status: 'confirmed',
          final_paid_at: new Date(),
          confirmed_at: new Date(),
        },
        { where: { id: booking.id } },
      );
    }
  }

  // Get payment statistics
  async getPaymentStats(weddingGroupUuid?: string, filterAdminId?: number | null) {
    let bookingWhere: any = {};
    let weddingGroupWhere: any = {};

    // Data-level filtering: Filter by wedding group owner
    if (filterAdminId !== null && filterAdminId !== undefined) {
      weddingGroupWhere.created_by = filterAdminId;
    }

    if (weddingGroupUuid) {
      const group = await this.weddingGroupsRepository.findOne({
        where: { uuid: weddingGroupUuid, ...weddingGroupWhere },
      });
      if (group) {
        bookingWhere.wedding_group_id = group.id;
      } else if (filterAdminId !== null && filterAdminId !== undefined) {
        // If filtering by admin and group not found or not owned, return empty stats
        return {
          wedding_group_uuid: weddingGroupUuid,
          success: [],
          pending: { count: 0, total_amount: 0 },
          failed: { count: 0, total_amount: 0 },
        };
      }
    } else if (filterAdminId !== null && filterAdminId !== undefined) {
      // Get all wedding group IDs owned by this admin
      const ownedGroups = await this.weddingGroupsRepository.findAll({
        where: weddingGroupWhere,
        attributes: ['id'],
      });
      const groupIds = ownedGroups.map((g) => g.id);
      if (groupIds.length > 0) {
        bookingWhere.wedding_group_id = { [Op.in]: groupIds };
      } else {
        return {
          wedding_group_uuid: 'all',
          success: [],
          pending: { count: 0, total_amount: 0 },
          failed: { count: 0, total_amount: 0 },
        };
      }
    }

    // Get total successful payments
    const successPayments = await this.paymentsRepository.findAll({
      where: { status: 'success' },
      include: [
        {
          model: Bookings,
          as: 'booking',
          where: Object.keys(bookingWhere).length > 0 ? bookingWhere : undefined,
          attributes: [],
        },
      ],
      attributes: [
        'payment_type',
        'payment_gateway',
        'currency',
        [Sequelize.fn('COUNT', Sequelize.col('payments.id')), 'count'],
        [Sequelize.fn('SUM', Sequelize.col('payments.amount')), 'total_amount'],
      ],
      group: ['payments.payment_type', 'payments.payment_gateway', 'payments.currency'],
      raw: true,
      subQuery: false,
    });

    // Get pending payments
    const pendingPayments = await this.paymentsRepository.findAll({
      where: { status: 'pending' },
      include: [
        {
          model: Bookings,
          as: 'booking',
          where: Object.keys(bookingWhere).length > 0 ? bookingWhere : undefined,
          attributes: [],
        },
      ],
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('payments.id')), 'count'],
        [Sequelize.fn('SUM', Sequelize.col('payments.amount')), 'total_amount'],
      ],
      raw: true,
      subQuery: false,
    });

    // Get failed payments
    const failedPayments = await this.paymentsRepository.findAll({
      where: { status: 'failed' },
      include: [
        {
          model: Bookings,
          as: 'booking',
          where: Object.keys(bookingWhere).length > 0 ? bookingWhere : undefined,
          attributes: [],
        },
      ],
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('payments.id')), 'count'],
        [Sequelize.fn('SUM', Sequelize.col('payments.amount')), 'total_amount'],
      ],
      raw: true,
      subQuery: false,
    });

    return {
      wedding_group_uuid: weddingGroupUuid || 'all',
      success: successPayments,
      pending: pendingPayments[0] || { count: 0, total_amount: 0 },
      failed: failedPayments[0] || { count: 0, total_amount: 0 },
    };
  }

  // Get payments for a specific booking
  async getPaymentsForBooking(bookingUuid: string, filterAdminId?: number | null) {
    const booking = await this.bookingsRepository.findOne({
      where: { uuid: bookingUuid },
      include: [
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: ['id', 'created_by'],
        },
      ],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Data-level filtering: Check ownership
    if (filterAdminId !== null && filterAdminId !== undefined) {
      if (booking.wedding_group?.created_by !== filterAdminId) {
        throw new NotFoundException('Booking not found or you do not have access');
      }
    }

    return await this.paymentsRepository.findAll({
      where: { booking_id: booking.id },
      order: [['created_at', 'DESC']],
    });
  }

  // Record manual payment (admin function)
  async recordManualPayment(
    bookingUuid: string,
    paymentType: 'deposit' | 'final',
    amount: number,
    notes?: string,
    sendNotification: boolean = false,
    filterAdminId?: number | null,
  ) {
    const payment = await this.createPayment({
      booking_uuid: bookingUuid,
      payment_type: paymentType as any,
      payment_gateway: 'manual' as any,
      amount,
      status: 'success' as any,
      metadata: notes ? { notes } : undefined,
    }, filterAdminId);

    // Send payment confirmation email if requested
    if (sendNotification) {
      await this.sendPaymentConfirmationEmail(bookingUuid, paymentType, amount);
    }

    return payment;
  }

  // Send payment confirmation email to guest
  private async sendPaymentConfirmationEmail(
    bookingUuid: string,
    paymentType: 'deposit' | 'final',
    amount: number,
  ) {
    try {
      const booking = await this.bookingsRepository.findOne({
        where: { uuid: bookingUuid },
        include: [
          {
            model: Guests,
            as: 'guest',
            attributes: ['uuid', 'name', 'email'],
          },
          {
            model: WeddingGroups,
            as: 'wedding_group',
            attributes: ['uuid', 'name', 'bride_name', 'groom_name', 'event_start_date'],
            include: [
              {
                model: Hotels,
                as: 'hotel',
                attributes: ['uuid', 'name'],
              },
            ],
          },
        ],
      });

      if (!booking || !booking.guest?.email) {
        this.logger.warn(`Cannot send payment confirmation - booking or guest email not found`);
        return;
      }

      const appName = getEnvironmentData('APP_NAME') || 'DestaPay';
      const logoUrl = getEnvironmentData('APP_LOGO_URL') || '';
      const frontendUrl = getEnvironmentData('FRONTEND_URL') || getEnvironmentData('APP_URL') || '';

      const weddingGroup = booking.wedding_group;
      // Handle couple name - avoid repeating if bride and groom names are the same
      let coupleName = '';
      if (weddingGroup) {
        const brideName = weddingGroup.bride_name || '';
        const groomName = weddingGroup.groom_name || '';
        if (brideName && groomName && brideName !== groomName) {
          coupleName = `${brideName} & ${groomName}`;
        } else if (brideName) {
          coupleName = brideName;
        } else if (groomName) {
          coupleName = groomName;
        } else if (weddingGroup.name) {
          coupleName = weddingGroup.name;
        }
      }

      // Calculate totals
      const allPayments = await this.paymentsRepository.findAll({
        where: { booking_id: booking.id, status: 'success' },
      });
      const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const balanceDue = Number(booking.total_amount) - totalPaid;

      // Format currency
      const formatCurrency = (value: number) => {
        return `${booking.currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      };

      const context = {
        appName,
        logoUrl,
        currentYear: new Date().getFullYear(),
        guestName: booking.guest.name || 'Guest',
        bookingReference: booking.booking_reference,
        coupleName,
        hotelName: weddingGroup?.hotel?.name || '',
        paymentType: paymentType === 'deposit' ? 'Deposit' : 'Final Payment',
        paymentAmount: formatCurrency(amount),
        totalPaid: formatCurrency(totalPaid),
        balanceDue: formatCurrency(balanceDue),
        isFullyPaid: balanceDue <= 0,
        paymentDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        viewBookingUrl: `${frontendUrl}/my-booking?ref=${booking.booking_reference}`,
      };

      await this.mailerService.sendMail({
        to: booking.guest.email,
        subject: `Payment Received - ${booking.booking_reference} | ${coupleName}'s Wedding`,
        template: 'payment-received',
        context,
      });

      this.logger.log(`Payment confirmation email sent to ${booking.guest.email} for ${booking.booking_reference}`);
    } catch (error) {
      this.logger.error(`Failed to send payment confirmation email:`, error);
      // Don't throw - payment was recorded successfully, just email failed
    }
  }

  // ==========================================
  // REFUND METHODS
  // ==========================================

  // Create a refund request (with cancellation policy enforcement)
  async createRefund(dto: CreateRefundDto, adminId: number, filterAdminId?: number | null) {
    // Get the payment with booking and wedding group
    const payment = await this.paymentsRepository.findOne({
      where: { uuid: dto.payment_uuid },
      include: [
        {
          model: Bookings,
          as: 'booking',
          include: [
            {
              model: WeddingGroups,
              as: 'wedding_group',
              attributes: ['id', 'uuid', 'name', 'event_start_date', 'created_by'],
            },
          ],
        },
      ],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Data-level filtering: Check ownership
    if (filterAdminId !== null && filterAdminId !== undefined) {
      if (payment.booking?.wedding_group?.created_by !== filterAdminId) {
        throw new NotFoundException('Payment not found or you do not have access');
      }
    }

    if (payment.status !== 'success') {
      throw new BadRequestException('Can only refund successful payments');
    }

    // Check if payment already has a pending/approved/processing refund
    const existingRefund = await this.refundsRepository.findOne({
      where: {
        payment_id: payment.id,
        status: { [Op.in]: ['pending', 'approved', 'processing'] },
      },
    });

    if (existingRefund) {
      throw new ConflictException('This payment already has a pending refund request');
    }

    // Get the wedding group for policy calculation
    const weddingGroup = payment.booking?.wedding_group;
    if (!weddingGroup) {
      throw new BadRequestException('Cannot determine wedding group for this payment');
    }

    // Calculate refund based on cancellation policy
    const paymentAmount = Number(payment.amount);
    const cancellationDate = new Date(); // Today

    const policyCalculation = await this.cancellationPoliciesService.calculateRefund(
      weddingGroup.id,
      cancellationDate,
      paymentAmount,
    );

    this.logger.log(`Policy calculation for payment ${payment.uuid}: ${JSON.stringify(policyCalculation)}`);

    // Check if refund is allowed based on policy
    if (policyCalculation.refund_percentage === 0) {
      throw new BadRequestException(
        `Refund not allowed. Based on cancellation policy, you are ${policyCalculation.days_until_event} days before the event. ` +
        `No refund is permitted at this time.`
      );
    }

    const maxRefundableAmount = policyCalculation.refund_amount;

    // Determine actual refund amount
    let refundAmount: number;
    let refundType = dto.refund_type;

    if (dto.refund_type === RefundType.FULL) {
      // "Full" refund means maximum allowed by policy (not necessarily 100%)
      refundAmount = maxRefundableAmount;
      // If policy doesn't allow 100%, it's actually a partial refund
      if (policyCalculation.refund_percentage < 100) {
        refundType = RefundType.PARTIAL;
      }
    } else {
      // Partial refund - validate requested amount
      if (!dto.amount) {
        throw new BadRequestException('Amount is required for partial refunds');
      }
      if (dto.amount > maxRefundableAmount) {
        throw new BadRequestException(
          `Requested refund amount ($${dto.amount}) exceeds maximum allowed by cancellation policy. ` +
          `Maximum refundable: $${maxRefundableAmount} (${policyCalculation.refund_percentage}% of $${paymentAmount}). ` +
          `Days until event: ${policyCalculation.days_until_event}.`
        );
      }
      refundAmount = dto.amount;
    }

    // Get the applicable policy record for reference
    let cancellationPolicyId: number | null = null;
    if (policyCalculation.applicable_policy) {
      const policy = await this.cancellationPoliciesRepository.findOne({
        where: { uuid: policyCalculation.applicable_policy.uuid },
        attributes: ['id'],
      });
      cancellationPolicyId = policy?.id || null;
    }

    // Create refund record with policy information
    // Admin-initiated refunds are auto-approved (no need for admin to approve their own request)
    const refund = await this.refundsRepository.create({
      uuid: uuidv4(),
      booking_id: payment.booking_id,
      payment_id: payment.id,
      refund_gateway: payment.payment_gateway,
      refund_type: refundType,
      amount: refundAmount,
      currency: payment.currency,
      reason: dto.reason,
      notes: dto.notes
        ? `${dto.notes}\n\n[Policy Applied] ${policyCalculation.refund_percentage}% refund allowed (${policyCalculation.days_until_event} days before event)`
        : `[Policy Applied] ${policyCalculation.refund_percentage}% refund allowed (${policyCalculation.days_until_event} days before event)`,
      status: 'approved', // Auto-approved for admin-initiated refunds
      approved_by: adminId,
      approved_at: new Date(),
      // Policy tracking fields
      cancellation_policy_id: cancellationPolicyId,
      policy_refund_percentage: policyCalculation.refund_percentage,
      original_payment_amount: paymentAmount,
      max_refundable_amount: maxRefundableAmount,
    });

    return this.getRefundByUuid(refund.uuid);
  }

  /**
   * Create a refund request at the booking level (total paid amount)
   * Similar to guest refund flow but initiated by admin
   */
  async createBookingRefund(dto: { booking_uuid: string; reason: string; notes?: string }, adminId: number, filterAdminId?: number | null) {
    // Get booking with payments and wedding group
    const booking = await this.bookingsRepository.findOne({
      where: { uuid: dto.booking_uuid },
      include: [
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: ['id', 'uuid', 'name', 'event_start_date', 'created_by'],
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
          attributes: ['id', 'uuid', 'name', 'email'],
        },
      ],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Data-level filtering: Check ownership
    if (filterAdminId !== null && filterAdminId !== undefined) {
      if (booking.wedding_group?.created_by !== filterAdminId) {
        throw new NotFoundException('Booking not found or you do not have access');
      }
    }

    // Check for existing pending/approved/processing refund for this booking
    const existingRefund = await this.refundsRepository.findOne({
      where: {
        booking_id: booking.id,
        status: { [Op.in]: ['pending', 'approved', 'processing'] },
      },
    });

    if (existingRefund) {
      throw new ConflictException('This booking already has a pending refund request');
    }

    // Calculate total paid
    const successfulPayments = booking.payments || [];
    const totalPaid = successfulPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    if (totalPaid === 0) {
      throw new BadRequestException('No payments found for this booking');
    }

    // Get the wedding group for policy calculation
    const weddingGroup = booking.wedding_group;
    if (!weddingGroup) {
      throw new BadRequestException('Cannot determine wedding group for this booking');
    }

    // Calculate refund based on cancellation policy
    const cancellationDate = new Date();
    const policyCalculation = await this.cancellationPoliciesService.calculateRefund(
      weddingGroup.id,
      cancellationDate,
      totalPaid,
    );

    this.logger.log(`Policy calculation for booking ${booking.uuid}: ${JSON.stringify(policyCalculation)}`);

    // Check if refund is allowed based on policy
    if (policyCalculation.refund_percentage === 0) {
      throw new BadRequestException(
        `Refund not allowed. Based on cancellation policy, you are ${policyCalculation.days_until_event} days before the event. ` +
        `No refund is permitted at this time.`
      );
    }

    // Get the applicable policy record for reference
    let cancellationPolicyId: number | null = null;
    if (policyCalculation.applicable_policy) {
      const policy = await this.cancellationPoliciesRepository.findOne({
        where: { uuid: policyCalculation.applicable_policy.uuid },
        attributes: ['id'],
      });
      cancellationPolicyId = policy?.id || null;
    }

    // Get the primary payment for gateway reference (prefer deposit, fallback to first payment)
    const primaryPayment = successfulPayments.find(p => p.payment_type === 'deposit')
      || successfulPayments[0];

    // Create ONE refund record for the entire booking
    // When processing, the system will refund ALL payments for this booking
    const refund = await this.refundsRepository.create({
      uuid: uuidv4(),
      booking_id: booking.id,
      payment_id: primaryPayment.id, // Primary payment for gateway reference
      refund_gateway: primaryPayment.payment_gateway,
      refund_type: policyCalculation.refund_percentage === 100 ? 'full' : 'partial',
      amount: policyCalculation.refund_amount, // Total refund amount
      currency: primaryPayment.currency, // Display currency from primary payment
      reason: dto.reason,
      notes: dto.notes
        ? `${dto.notes}\n\n[Admin Request] ${policyCalculation.refund_percentage}% refund (${policyCalculation.days_until_event} days before event). Total paid: $${totalPaid}`
        : `[Admin Request] ${policyCalculation.refund_percentage}% refund (${policyCalculation.days_until_event} days before event). Total paid: $${totalPaid}`,
      status: 'approved', // Auto-approved for admin-initiated refunds
      approved_by: adminId,
      approved_at: new Date(),
      // Policy tracking fields
      cancellation_policy_id: cancellationPolicyId,
      policy_refund_percentage: policyCalculation.refund_percentage,
      original_payment_amount: totalPaid,
      max_refundable_amount: policyCalculation.refund_amount,
    });

    this.logger.log(
      `Admin refund request created for booking ${booking.booking_reference}. ` +
      `Total refund: $${policyCalculation.refund_amount} (${policyCalculation.refund_percentage}% of $${totalPaid}). ` +
      `Payments to refund: ${successfulPayments.length}`
    );

    return this.getRefundByUuid(refund.uuid);
  }

  // Get all refunds with filters
  async getAllRefunds(query: RefundQueryDto, filterAdminId?: number | null) {
    const {
      booking_uuid,
      payment_uuid,
      wedding_group_uuid,
      status,
      refund_type,
      refund_gateway,
      search,
      date_from,
      date_to,
      page = 1,
      limit = 25,
      sort_by = 'created_at',
      sort_order = 'DESC',
    } = query;

    const offset = (page - 1) * limit;
    const where: any = {};
    const bookingWhere: any = {};
    const weddingGroupWhere: any = {};

    // Data-level filtering: Filter by wedding group owner
    if (filterAdminId !== null && filterAdminId !== undefined) {
      weddingGroupWhere.created_by = filterAdminId;
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by refund type
    if (refund_type) {
      where.refund_type = refund_type;
    }

    // Filter by gateway
    if (refund_gateway) {
      where.refund_gateway = refund_gateway;
    }

    // Filter by payment
    if (payment_uuid) {
      const payment = await this.paymentsRepository.findOne({
        where: { uuid: payment_uuid },
      });
      if (payment) {
        where.payment_id = payment.id;
      }
    }

    // Filter by booking
    if (booking_uuid) {
      const booking = await this.bookingsRepository.findOne({
        where: { uuid: booking_uuid },
      });
      if (booking) {
        where.booking_id = booking.id;
      }
    }

    // Filter by wedding group
    if (wedding_group_uuid) {
      const group = await this.weddingGroupsRepository.findOne({
        where: { uuid: wedding_group_uuid },
      });
      if (group) {
        bookingWhere.wedding_group_id = group.id;
      }
    }

    // Filter by date range
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) {
        where.created_at[Op.gte] = new Date(date_from);
      }
      if (date_to) {
        where.created_at[Op.lte] = new Date(date_to + 'T23:59:59');
      }
    }

    // Search
    if (search) {
      where[Op.or] = [
        { reason: { [Op.iLike]: `%${search}%` } },
        { transaction_id: { [Op.iLike]: `%${search}%` } },
        { '$booking.booking_reference$': { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Determine if includes should be required (for filtering)
    const hasBookingWhere = Object.keys(bookingWhere).length > 0;
    const hasWeddingGroupWhere = Object.keys(weddingGroupWhere).length > 0;

    const { rows: refunds, count: total } = await this.refundsRepository.findAndCountAll({
      where,
      include: [
        {
          model: Bookings,
          as: 'booking',
          where: hasBookingWhere ? bookingWhere : undefined,
          required: hasBookingWhere || hasWeddingGroupWhere, // Required if filtering by booking or wedding group
          attributes: ['uuid', 'booking_reference', 'total_amount', 'status'],
          include: [
            {
              model: Guests,
              as: 'guest',
              attributes: ['uuid', 'name', 'email'],
            },
            {
              model: WeddingGroups,
              as: 'wedding_group',
              attributes: ['uuid', 'name', 'created_by'],
              where: hasWeddingGroupWhere ? weddingGroupWhere : undefined,
              required: hasWeddingGroupWhere, // Required if filtering by wedding group owner
            },
          ],
        },
        {
          model: Payments,
          as: 'payment',
          attributes: ['uuid', 'amount', 'payment_type', 'payment_gateway', 'status'],
        },
        {
          model: Admins,
          as: 'processed_by_admin',
          attributes: ['uuid', 'name', 'email'],
        },
      ],
      order: [[sort_by, sort_order]],
      limit,
      offset,
    });

    return {
      refunds: refunds.map((r) => this.formatRefund(r)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get refund by UUID
  async getRefundByUuid(uuid: string, filterAdminId?: number | null) {
    const weddingGroupWhere: any = {};

    // Data-level filtering: Filter by wedding group owner
    if (filterAdminId !== null && filterAdminId !== undefined) {
      weddingGroupWhere.created_by = filterAdminId;
    }

    const hasWeddingGroupWhere = Object.keys(weddingGroupWhere).length > 0;

    const refund = await this.refundsRepository.findOne({
      where: { uuid },
      include: [
        {
          model: Bookings,
          as: 'booking',
          required: hasWeddingGroupWhere, // Required if filtering by wedding group owner
          attributes: ['uuid', 'booking_reference', 'total_amount', 'deposit_amount', 'status', 'check_in_date', 'check_out_date'],
          include: [
            {
              model: Guests,
              as: 'guest',
              attributes: ['uuid', 'name', 'email', 'phone'],
            },
            {
              model: WeddingGroups,
              as: 'wedding_group',
              attributes: ['uuid', 'name', 'timezone', 'created_by'],
              where: hasWeddingGroupWhere ? weddingGroupWhere : undefined,
              required: hasWeddingGroupWhere, // Required if filtering by wedding group owner
              include: [
                {
                  model: Hotels,
                  as: 'hotel',
                  attributes: ['uuid', 'name'],
                },
              ],
            },
          ],
        },
        {
          model: Payments,
          as: 'payment',
          attributes: ['uuid', 'amount', 'payment_type', 'payment_gateway', 'transaction_id', 'payment_intent_id', 'status', 'paid_at'],
        },
        {
          model: Admins,
          as: 'processed_by_admin',
          attributes: ['uuid', 'name', 'email'],
        },
      ],
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    return this.formatRefund(refund);
  }

  // Approve a refund
  async approveRefund(uuid: string, dto: ApproveRefundDto, adminId: number, filterAdminId?: number | null) {
    const refund = await this.refundsRepository.findOne({
      where: { uuid },
      include: [
        {
          model: Bookings,
          as: 'booking',
          include: [
            { model: Guests, as: 'guest', attributes: ['name', 'email'] },
            { model: WeddingGroups, as: 'wedding_group', attributes: ['name', 'created_by'] },
          ],
        },
      ],
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    // Data-level filtering: Check ownership
    if (filterAdminId !== null && filterAdminId !== undefined) {
      if (refund.booking?.wedding_group?.created_by !== filterAdminId) {
        throw new NotFoundException('Refund not found or you do not have access');
      }
    }

    if (refund.status !== 'pending') {
      throw new BadRequestException('Can only approve pending refunds');
    }

    await refund.update({
      status: 'approved',
      notes: dto.notes ? `${refund.notes || ''}\n[Approved] ${dto.notes}`.trim() : refund.notes,
    });

    // Emit event
    this.eventsService.emit(EventType.REFUND_APPROVED, {
      refund_uuid: refund.uuid,
      booking_reference: refund.booking?.booking_reference,
      amount: Number(refund.amount),
    });

    // Send notification to guest
    if (refund.booking?.guest?.email) {
      await this.refundNotificationService.notifyGuestOfRefundStatus({
        guestName: refund.booking.guest.name || 'Guest',
        guestEmail: refund.booking.guest.email,
        bookingReference: refund.booking.booking_reference,
        weddingName: refund.booking.wedding_group?.name || '',
        refundAmount: Number(refund.amount).toFixed(2),
        status: 'approved',
      });
    }

    return this.getRefundByUuid(uuid);
  }

  // Deny a refund
  async denyRefund(uuid: string, dto: DenyRefundDto, adminId: number, filterAdminId?: number | null) {
    const refund = await this.refundsRepository.findOne({
      where: { uuid },
      include: [
        {
          model: Bookings,
          as: 'booking',
          include: [
            { model: Guests, as: 'guest', attributes: ['name', 'email'] },
            { model: WeddingGroups, as: 'wedding_group', attributes: ['name', 'created_by'] },
          ],
        },
      ],
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    // Data-level filtering: Check ownership
    if (filterAdminId !== null && filterAdminId !== undefined) {
      if (refund.booking?.wedding_group?.created_by !== filterAdminId) {
        throw new NotFoundException('Refund not found or you do not have access');
      }
    }

    if (refund.status !== 'pending') {
      throw new BadRequestException('Can only deny pending refunds');
    }

    await refund.update({
      status: 'denied',
      failure_reason: dto.denial_reason,
      notes: dto.notes ? `${refund.notes || ''}\n[Denied] ${dto.notes}`.trim() : refund.notes,
      processed_by: adminId,
      processed_at: new Date(),
    });

    // Emit event
    this.eventsService.emit(EventType.REFUND_DENIED, {
      refund_uuid: refund.uuid,
      booking_reference: refund.booking?.booking_reference,
      amount: Number(refund.amount),
      reason: dto.denial_reason,
    });

    // Send notification to guest
    if (refund.booking?.guest?.email) {
      await this.refundNotificationService.notifyGuestOfRefundStatus({
        guestName: refund.booking.guest.name || 'Guest',
        guestEmail: refund.booking.guest.email,
        bookingReference: refund.booking.booking_reference,
        weddingName: refund.booking.wedding_group?.name || '',
        refundAmount: Number(refund.amount).toFixed(2),
        status: 'denied',
        denialReason: dto.denial_reason,
      });
    }

    return this.getRefundByUuid(uuid);
  }

  // Process an approved refund
  // This method refunds ALL successful payments for the booking (not just the linked payment)
  async processRefund(uuid: string, dto: ProcessRefundDto, adminId: number, filterAdminId?: number | null) {
    const refund = await this.refundsRepository.findOne({
      where: { uuid },
      include: [
        { model: Payments, as: 'payment' },
        {
          model: Bookings,
          as: 'booking',
          include: [
            { model: WeddingGroups, as: 'wedding_group', attributes: ['id', 'created_by'] },
          ],
        },
      ],
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    // Data-level filtering: Check ownership
    if (filterAdminId !== null && filterAdminId !== undefined) {
      if (refund.booking?.wedding_group?.created_by !== filterAdminId) {
        throw new NotFoundException('Refund not found or you do not have access');
      }
    }

    if (refund.status !== 'approved') {
      throw new BadRequestException('Can only process approved refunds');
    }

    // Mark as processing
    await refund.update({ status: 'processing' });

    // Get ALL successful payments for this booking
    const allPayments = await this.paymentsRepository.findAll({
      where: {
        booking_id: refund.booking_id,
        status: 'success',
      },
      order: [['created_at', 'ASC']], // Process in order: deposit first, then final
    });

    if (allPayments.length === 0) {
      throw new BadRequestException('No successful payments found for this booking');
    }

    // Calculate refund percentage from policy
    const refundPercentage = (refund.policy_refund_percentage || 100) / 100;
    const transactionIds: string[] = [];
    const refundedPayments: { payment_type: string; amount: number; currency: string; transaction_id: string }[] = [];

    this.logger.log(
      `Processing refund for booking ${refund.booking_id}. ` +
      `Found ${allPayments.length} payment(s) to refund at ${refund.policy_refund_percentage}%`
    );

    try {
      if (dto.gateway === 'stripe') {
        // Process Stripe refund for EACH payment
        for (const payment of allPayments) {
          if (!payment.payment_intent_id) {
            this.logger.warn(
              `Payment ${payment.uuid} (${payment.payment_type}) has no payment_intent_id, skipping Stripe refund`
            );
            continue;
          }

          // Calculate proportional refund amount for this payment
          const paymentAmount = Number(payment.amount);
          const refundAmount = refund.refund_type === 'full'
            ? paymentAmount  // Full refund = 100% of each payment
            : Math.round(paymentAmount * refundPercentage * 100) / 100;

          this.logger.log(
            `Processing Stripe refund for ${payment.payment_type} payment: ` +
            `$${refundAmount} ${payment.currency} (${refundPercentage * 100}% of $${paymentAmount})`
          );

          const stripeRefund = await this.stripeService.createRefund({
            paymentIntentId: payment.payment_intent_id,
            amount: refundAmount, // Always specify amount for accurate refunds
            reason: 'requested_by_customer',
            metadata: {
              refund_uuid: refund.uuid,
              booking_id: String(refund.booking_id),
              payment_type: payment.payment_type,
            },
          });

          transactionIds.push(stripeRefund.id);
          refundedPayments.push({
            payment_type: payment.payment_type,
            amount: refundAmount,
            currency: payment.currency,
            transaction_id: stripeRefund.id,
          });

          this.logger.log(
            `Stripe refund created for ${payment.payment_type}: ${stripeRefund.id} - $${refundAmount} ${payment.currency}`
          );

          // Mark this payment as refunded
          await this.paymentsRepository.update(
            { status: 'refunded' },
            { where: { id: payment.id } },
          );
        }

        if (transactionIds.length === 0) {
          throw new BadRequestException('No payments could be refunded via Stripe. Check payment intent IDs.');
        }
      } else {
        // Manual refund - mark all payments as refunded
        transactionIds.push(dto.transaction_id || 'manual');

        for (const payment of allPayments) {
          await this.paymentsRepository.update(
            { status: 'refunded' },
            { where: { id: payment.id } },
          );
        }

        this.logger.log(`Manual refund recorded for ${allPayments.length} payment(s)`);
      }

      // Build refund summary for notes
      const refundSummary = refundedPayments.length > 0
        ? refundedPayments.map(p => `${p.payment_type}: $${p.amount} ${p.currency} (${p.transaction_id})`).join(', ')
        : `${allPayments.length} payment(s) marked as refunded`;

      // Mark refund as processed with all transaction IDs
      await refund.update({
        status: 'processed',
        refund_gateway: dto.gateway,
        transaction_id: transactionIds.join(','), // Store all transaction IDs
        notes: `${refund.notes || ''}\n[Processed] ${dto.notes || ''}\n[Refunds] ${refundSummary}`.trim(),
        processed_by: adminId,
        processed_at: new Date(),
      });

      // Update booking status to cancelled (for any refund, partial or full)
      await this.bookingsRepository.update(
        { status: 'cancelled' },
        { where: { id: refund.booking_id } },
      );

      // Emit payment.refunded event
      this.eventsService.emit(EventType.PAYMENT_REFUNDED, {
        refund_uuid: refund.uuid,
        payment_uuid: refund.payment.uuid,
        booking_uuid: refund.booking.uuid,
        booking_reference: refund.booking.booking_reference,
        amount: Number(refund.amount),
        currency: refund.currency,
        refund_type: refund.refund_type,
        refund_gateway: dto.gateway,
        transaction_id: transactionIds.join(','),
        reason: refund.reason,
        payments_refunded: refundedPayments.length || allPayments.length,
      });

      // Get guest details for notification
      const bookingWithGuest = await this.bookingsRepository.findOne({
        where: { id: refund.booking_id },
        include: [
          { model: Guests, as: 'guest', attributes: ['name', 'email'] },
          { model: WeddingGroups, as: 'wedding_group', attributes: ['name'] },
        ],
      });

      // Send notification to guest
      if (bookingWithGuest?.guest?.email) {
        await this.refundNotificationService.notifyGuestOfRefundStatus({
          guestName: bookingWithGuest.guest.name || 'Guest',
          guestEmail: bookingWithGuest.guest.email,
          bookingReference: bookingWithGuest.booking_reference,
          weddingName: bookingWithGuest.wedding_group?.name || '',
          refundAmount: Number(refund.amount).toFixed(2),
          status: 'processed',
        });
      }

      this.logger.log(
        `Refund processing complete for booking ${refund.booking.booking_reference}. ` +
        `${transactionIds.length} Stripe refund(s) created.`
      );

      return this.getRefundByUuid(uuid);
    } catch (error) {
      // Mark refund as failed
      await refund.update({
        status: 'failed',
        failure_reason: error.message,
        processed_by: adminId,
        processed_at: new Date(),
      });

      throw new BadRequestException(`Refund processing failed: ${error.message}`);
    }
  }

  // Get refund statistics
  async getRefundStats(weddingGroupUuid?: string, filterAdminId?: number | null) {
    let whereClause: any = {};
    let weddingGroupWhere: any = {};

    // Data-level filtering: Filter by wedding group owner
    if (filterAdminId !== null && filterAdminId !== undefined) {
      weddingGroupWhere.created_by = filterAdminId;
    }

    if (weddingGroupUuid) {
      const group = await this.weddingGroupsRepository.findOne({
        where: { uuid: weddingGroupUuid, ...weddingGroupWhere },
      });
      if (group) {
        // Use subquery to filter by wedding group
        const bookingIds = await Bookings.findAll({
          attributes: ['id'],
          where: { wedding_group_id: group.id },
          raw: true,
        });
        whereClause.booking_id = bookingIds.map((b: any) => b.id);
      } else if (filterAdminId !== null && filterAdminId !== undefined) {
        // If filtering by admin and group not found or not owned, return empty stats
        return {
          pending: { count: 0, total_amount: 0 },
          approved: { count: 0, total_amount: 0 },
          denied: { count: 0, total_amount: 0 },
          processing: { count: 0, total_amount: 0 },
          processed: { count: 0, total_amount: 0 },
          failed: { count: 0, total_amount: 0 },
        };
      }
    } else if (filterAdminId !== null && filterAdminId !== undefined) {
      // Get all wedding group IDs owned by this admin
      const ownedGroups = await this.weddingGroupsRepository.findAll({
        where: weddingGroupWhere,
        attributes: ['id'],
      });
      const groupIds = ownedGroups.map((g) => g.id);
      if (groupIds.length > 0) {
        const bookingIds = await Bookings.findAll({
          attributes: ['id'],
          where: { wedding_group_id: { [Op.in]: groupIds } },
          raw: true,
        });
        whereClause.booking_id = bookingIds.map((b: any) => b.id);
      } else {
        return {
          pending: { count: 0, total_amount: 0 },
          approved: { count: 0, total_amount: 0 },
          denied: { count: 0, total_amount: 0 },
          processing: { count: 0, total_amount: 0 },
          processed: { count: 0, total_amount: 0 },
          failed: { count: 0, total_amount: 0 },
        };
      }
    }

    const stats = await this.refundsRepository.findAll({
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'total_amount'],
      ],
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      group: ['status'],
      raw: true,
    });

    const result = {
      pending: { count: 0, total_amount: 0 },
      approved: { count: 0, total_amount: 0 },
      denied: { count: 0, total_amount: 0 },
      processing: { count: 0, total_amount: 0 },
      processed: { count: 0, total_amount: 0 },
      failed: { count: 0, total_amount: 0 },
    };

    stats.forEach((s: any) => {
      if (result[s.status]) {
        result[s.status] = {
          count: parseInt(s.count, 10),
          total_amount: parseFloat(s.total_amount) || 0,
        };
      }
    });

    return result;
  }

  // Format refund for API response
  private formatRefund(refund: Refunds) {
    return {
      uuid: refund.uuid,
      refund_type: refund.refund_type,
      refund_gateway: refund.refund_gateway,
      amount: Number(refund.amount),
      currency: refund.currency,
      reason: refund.reason,
      status: refund.status,
      failure_reason: refund.failure_reason,
      transaction_id: refund.transaction_id,
      notes: refund.notes,
      // Policy tracking fields
      policy_refund_percentage: refund.policy_refund_percentage,
      original_payment_amount: refund.original_payment_amount ? Number(refund.original_payment_amount) : null,
      max_refundable_amount: refund.max_refundable_amount ? Number(refund.max_refundable_amount) : null,
      processed_at: refund.processed_at,
      created_at: refund.created_at,
      updated_at: refund.updated_at,
      booking: refund.booking
        ? {
            uuid: refund.booking.uuid,
            booking_reference: refund.booking.booking_reference,
            total_amount: Number(refund.booking.total_amount),
            status: refund.booking.status,
            guest: refund.booking.guest
              ? {
                  uuid: refund.booking.guest.uuid,
                  name: refund.booking.guest.name,
                  email: refund.booking.guest.email,
                }
              : null,
            wedding_group: refund.booking.wedding_group
              ? {
                  uuid: refund.booking.wedding_group.uuid,
                  name: refund.booking.wedding_group.name,
                }
              : null,
          }
        : null,
      payment: refund.payment
        ? {
            uuid: refund.payment.uuid,
            amount: Number(refund.payment.amount),
            payment_type: refund.payment.payment_type,
            payment_gateway: refund.payment.payment_gateway,
            status: refund.payment.status,
          }
        : null,
      processed_by: refund.processed_by_admin
        ? {
            uuid: refund.processed_by_admin.uuid,
            name: refund.processed_by_admin.name,
          }
        : null,
    };
  }
}
