import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  Req,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/decorators/require-permission.decorator';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/CreatePaymentDto';
import { UpdatePaymentDto } from './dto/UpdatePaymentDto';
import { PaymentQueryDto } from './dto/PaymentQueryDto';
import { CreateRefundDto, CreateBookingRefundDto } from './dto/CreateRefundDto';
import { RefundQueryDto } from './dto/RefundQueryDto';
import { ApproveRefundDto, DenyRefundDto, ProcessRefundDto } from './dto/ProcessRefundDto';
import { getDataFilterAdminId, hasFullDataAccess } from 'src/helpers/data-ownership.helper';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@ApiTags('Admin - Payments')
@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard, PermissionGuard)
@Controller({ version: '1', path: 'payments' })
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  @RequirePermission('payments.view')
  @Get()
  @ApiOperation({ summary: 'Get all payments with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'booking_uuid', required: false, type: String })
  @ApiQuery({ name: 'wedding_group_uuid', required: false, type: String })
  @ApiQuery({ name: 'payment_type', required: false, enum: ['deposit', 'final'] })
  @ApiQuery({ name: 'payment_gateway', required: false, enum: ['stripe', 'wetravel', 'manual'] })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'processing', 'success', 'failed', 'refunded'] })
  @ApiQuery({ name: 'date_from', required: false, type: String })
  @ApiQuery({ name: 'date_to', required: false, type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of payments' })
  async getAllPayments(@Query() queries: PaymentQueryDto, @Req() req: any) {
    // Data-level filtering: Non-super users only see payments from their wedding groups
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const result = await this.paymentsService.getAllPayments(queries, filterAdminId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Payments fetched successfully',
      data: {
        payments: result.rows,
        total: result.count,
        page: Number(queries.page) || 1,
        limit: Number(queries.limit) || 10,
      },
    };
  }

  @RequirePermission('payments.view')
  @Get('stats')
  @ApiOperation({ summary: 'Get payment statistics' })
  @ApiQuery({ name: 'wedding_group_uuid', required: false, type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'Payment statistics' })
  async getPaymentStats(@Query('wedding_group_uuid') weddingGroupUuid: string | undefined, @Req() req: any) {
    // Data-level filtering: Non-super users only see stats from their wedding groups
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const stats = await this.paymentsService.getPaymentStats(weddingGroupUuid, filterAdminId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Payment statistics fetched successfully',
      data: stats,
    };
  }

  @RequirePermission('payments.view')
  @Get('booking/:bookingUuid')
  @ApiOperation({ summary: 'Get all payments for a booking' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Payments for booking' })
  async getPaymentsForBooking(@Param('bookingUuid') bookingUuid: string, @Req() req: any) {
    // Data-level filtering: Non-super users only see payments from their wedding groups
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const payments = await this.paymentsService.getPaymentsForBooking(bookingUuid, filterAdminId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Payments fetched successfully',
      data: payments,
    };
  }

  // ==================== REFUND ENDPOINTS ====================
  // NOTE: These must be BEFORE @Get(':uuid') to avoid route conflicts

  @RequirePermission('payments.view')
  @Get('refunds')
  @ApiOperation({ summary: 'Get all refunds with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'booking_uuid', required: false, type: String })
  @ApiQuery({ name: 'payment_uuid', required: false, type: String })
  @ApiQuery({ name: 'refund_type', required: false, enum: ['full', 'partial'] })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'denied', 'processing', 'processed', 'failed'] })
  @ApiQuery({ name: 'date_from', required: false, type: String })
  @ApiQuery({ name: 'date_to', required: false, type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of refunds' })
  async getAllRefunds(@Query() queries: RefundQueryDto, @Req() req: any) {
    // Data-level filtering: Non-super users only see refunds from their wedding groups
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const result = await this.paymentsService.getAllRefunds(queries, filterAdminId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Refunds fetched successfully',
      data: {
        refunds: result.refunds,
        total: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalPages: result.pagination.totalPages,
      },
    };
  }

  @RequirePermission('payments.view')
  @Get('refunds/stats')
  @ApiOperation({ summary: 'Get refund statistics' })
  @ApiQuery({ name: 'wedding_group_uuid', required: false, type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'Refund statistics' })
  async getRefundStats(@Query('wedding_group_uuid') weddingGroupUuid: string | undefined, @Req() req: any) {
    // Data-level filtering: Non-super users only see stats from their wedding groups
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const stats = await this.paymentsService.getRefundStats(weddingGroupUuid, filterAdminId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Refund statistics fetched successfully',
      data: stats,
    };
  }

  @RequirePermission('payments.view')
  @Get('refunds/:uuid')
  @ApiOperation({ summary: 'Get refund by UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Refund details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Refund not found' })
  async getRefund(@Param('uuid') uuid: string, @Req() req: any) {
    // Data-level filtering: Non-super users only see refunds from their wedding groups
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const refund = await this.paymentsService.getRefundByUuid(uuid, filterAdminId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Refund fetched successfully',
      data: refund,
    };
  }

  @RequirePermission('refunds.create')
  @Post('refunds')
  @ApiOperation({ summary: 'Create a refund request' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Refund request created' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Payment not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid refund request' })
  async createRefund(@Body() createDto: CreateRefundDto, @Req() req: any, @Ip() ip: string) {
    const admin = req.user;
    const adminId = admin?.id;
    const filterAdminId = getDataFilterAdminId(admin);

    const refund = await this.paymentsService.createRefund(createDto, adminId, filterAdminId);

    // Log activity
    await this.activityLogsService.logActivity({
      adminId,
      action: 'REFUND_REQUEST',
      entityType: 'refund',
      entityId: refund.uuid,
      entityName: `Refund $${createDto.amount}`,
      description: `Created refund request for ${createDto.amount} (payment: ${createDto.payment_uuid})`,
      ipAddress: ip,
      metadata: { amount: createDto.amount, payment_uuid: createDto.payment_uuid },
    });

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Refund request created successfully',
      data: refund,
    };
  }

  @RequirePermission('bookings.refund')
  @Post('refunds/booking')
  @ApiOperation({ summary: 'Create a refund request for a booking (total paid amount)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Refund request created' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Booking not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid refund request' })
  async createBookingRefund(@Body() createDto: CreateBookingRefundDto, @Req() req: any, @Ip() ip: string) {
    const admin = req.user;
    const adminId = admin?.id;
    const filterAdminId = getDataFilterAdminId(admin);

    const refund = await this.paymentsService.createBookingRefund(createDto, adminId, filterAdminId);

    // Log activity
    await this.activityLogsService.logActivity({
      adminId,
      action: 'REFUND_REQUEST',
      entityType: 'refund',
      entityId: refund.uuid,
      entityName: `Booking Refund`,
      description: `Created booking refund request (booking: ${createDto.booking_uuid})`,
      ipAddress: ip,
      metadata: { booking_uuid: createDto.booking_uuid },
    });

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Refund request created successfully',
      data: refund,
    };
  }

  @RequirePermission('refunds.approve')
  @Post('refunds/:uuid/approve')
  @ApiOperation({ summary: 'Approve a refund request' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Refund approved' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Refund not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Refund cannot be approved' })
  async approveRefund(
    @Param('uuid') uuid: string,
    @Body() approveDto: ApproveRefundDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const admin = req.user;
    const adminId = admin?.id;
    const filterAdminId = getDataFilterAdminId(admin);

    const refund = await this.paymentsService.approveRefund(uuid, approveDto, adminId, filterAdminId);

    // Log activity
    await this.activityLogsService.logActivity({
      adminId,
      action: 'REFUND_APPROVE',
      entityType: 'refund',
      entityId: uuid,
      entityName: `Refund Approval`,
      description: `Approved refund request`,
      ipAddress: ip,
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'Refund approved successfully',
      data: refund,
    };
  }

  @RequirePermission('refunds.deny')
  @Post('refunds/:uuid/deny')
  @ApiOperation({ summary: 'Deny a refund request' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Refund denied' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Refund not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Refund cannot be denied' })
  async denyRefund(
    @Param('uuid') uuid: string,
    @Body() denyDto: DenyRefundDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const admin = req.user;
    const adminId = admin?.id;
    const filterAdminId = getDataFilterAdminId(admin);

    const refund = await this.paymentsService.denyRefund(uuid, denyDto, adminId, filterAdminId);

    // Log activity
    await this.activityLogsService.logActivity({
      adminId,
      action: 'REFUND_DENY',
      entityType: 'refund',
      entityId: uuid,
      entityName: `Refund Denial`,
      description: `Denied refund request: ${denyDto.denial_reason}`,
      ipAddress: ip,
      metadata: { denial_reason: denyDto.denial_reason },
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'Refund denied',
      data: refund,
    };
  }

  @RequirePermission('refunds.process')
  @Post('refunds/:uuid/process')
  @ApiOperation({ summary: 'Process an approved refund' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Refund processed' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Refund not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Refund cannot be processed' })
  async processRefund(
    @Param('uuid') uuid: string,
    @Body() processDto: ProcessRefundDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const admin = req.user;
    const adminId = admin?.id;
    const filterAdminId = getDataFilterAdminId(admin);

    const refund = await this.paymentsService.processRefund(uuid, processDto, adminId, filterAdminId);

    // Log activity
    await this.activityLogsService.logActivity({
      adminId,
      action: 'REFUND_PROCESS',
      entityType: 'refund',
      entityId: uuid,
      entityName: `Refund via ${processDto.gateway}`,
      description: `Processed refund via ${processDto.gateway}`,
      ipAddress: ip,
      metadata: { gateway: processDto.gateway, transaction_id: processDto.transaction_id },
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'Refund processed successfully',
      data: refund,
    };
  }

  // NOTE: This must be LAST - catches any UUID that doesn't match above routes
  @RequirePermission('payments.view')
  @Get(':uuid')
  @ApiOperation({ summary: 'Get payment by UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Payment details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Payment not found' })
  async getPayment(@Param('uuid') uuid: string, @Req() req: any) {
    // Data-level filtering: Non-super users only see payments from their wedding groups
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const payment = await this.paymentsService.getPaymentByUuid(uuid, filterAdminId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Payment fetched successfully',
      data: payment,
    };
  }

  @RequirePermission('payments.create')
  @Post()
  @ApiOperation({ summary: 'Record a new payment' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Payment recorded' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Booking not found' })
  async createPayment(@Body() createDto: CreatePaymentDto, @Req() req: any) {
    // Data-level filtering: Non-super users can only create payments for their bookings
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const payment = await this.paymentsService.createPayment(createDto, filterAdminId);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Payment recorded successfully',
      data: payment,
    };
  }

  @RequirePermission('bookings.record-payment')
  @Post('manual')
  @ApiOperation({ summary: 'Record a manual payment (cash/check/bank transfer)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Manual payment recorded' })
  async recordManualPayment(
    @Body()
    body: {
      booking_uuid: string;
      payment_type: 'deposit' | 'final';
      amount: number;
      notes?: string;
      send_notification?: boolean;
    },
    @Req() req: any,
    @Ip() ip: string,
  ) {
    // Data-level filtering: Non-super users can only record payments for their bookings
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const payment = await this.paymentsService.recordManualPayment(
      body.booking_uuid,
      body.payment_type,
      body.amount,
      body.notes,
      body.send_notification ?? false,
      filterAdminId,
    );

    // Log activity
    await this.activityLogsService.logActivity({
      adminId: admin?.id,
      action: 'MANUAL_PAYMENT',
      entityType: 'payment',
      entityId: payment.uuid,
      entityName: `Manual Payment $${body.amount}`,
      description: `Recorded manual ${body.payment_type} payment of ${body.amount} for booking ${body.booking_uuid}`,
      ipAddress: ip,
      metadata: {
        amount: body.amount,
        payment_type: body.payment_type,
        booking_uuid: body.booking_uuid,
        notes: body.notes,
      },
    });

    return {
      statusCode: HttpStatus.CREATED,
      message: body.send_notification ? 'Manual payment recorded and confirmation sent to guest' : 'Manual payment recorded successfully',
      data: payment,
    };
  }

  @RequirePermission('payments.create')
  @Patch(':uuid')
  @ApiOperation({ summary: 'Update a payment' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Payment updated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Payment not found' })
  async updatePayment(
    @Param('uuid') uuid: string,
    @Body() updateDto: UpdatePaymentDto,
    @Req() req: any,
  ) {
    // Data-level filtering: Non-super users can only update their payments
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const payment = await this.paymentsService.updatePayment(uuid, updateDto, filterAdminId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Payment updated successfully',
      data: payment,
    };
  }

  @RequirePermission('payments.create')
  @Patch(':uuid/status')
  @ApiOperation({ summary: 'Update payment status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Status updated' })
  async updateStatus(
    @Param('uuid') uuid: string,
    @Body('status') status: string,
    @Body('failure_reason') failureReason: string | undefined,
    @Req() req: any,
  ) {
    // Data-level filtering: Non-super users can only update their payments
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const updateData: UpdatePaymentDto = { status: status as any };
    if (failureReason) {
      updateData.failure_reason = failureReason;
    }
    const payment = await this.paymentsService.updatePayment(uuid, updateData, filterAdminId);
    return {
      statusCode: HttpStatus.OK,
      message: `Payment status updated to ${status}`,
      data: payment,
    };
  }
}
