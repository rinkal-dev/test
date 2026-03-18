import {
  Controller,
  Get,
  Query,
  Param,
  Res,
  UseGuards,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/decorators/require-permission.decorator';
import { ReportsService } from './reports.service';
import { ReportQueryDto, DateRangeType } from './dto/ReportQueryDto';
import { getDataFilterAdminId } from 'src/helpers/data-ownership.helper';
import { formatInTimezone } from 'src/helpers/timezone.helper';

// Helper to format date for CSV export with timezone (no timezone label)
const formatDateForExport = (date: Date | string | null | undefined, timezone?: string): string => {
  if (!date) return '';
  const tz = timezone || 'UTC';
  return formatInTimezone(date, tz, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }); // "02/24/2026, 05:52"
};

@ApiTags('Admin - Reports')
@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard, PermissionGuard)
@Controller({ version: '1', path: 'reports' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Dashboard summary - all key metrics in one call
   */
  @RequirePermission('dashboard.view')
  @Get('dashboard-summary')
  @ApiOperation({ summary: 'Get dashboard summary with key metrics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Dashboard summary data' })
  async getDashboardSummary(@Req() req: any) {
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const summary = await this.reportsService.getDashboardSummary(filterAdminId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Dashboard summary fetched successfully',
      data: summary,
    };
  }

  /**
   * Get wedding groups for filter dropdown
   */
  @RequirePermission('reports.view')
  @Get('filters/wedding-groups')
  @ApiOperation({ summary: 'Get wedding groups for report filters' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Wedding groups list' })
  async getWeddingGroupsFilter(@Req() req: any) {
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const groups = await this.reportsService.getWeddingGroupsForFilter(filterAdminId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Wedding groups fetched successfully',
      data: groups,
    };
  }

  /**
   * 1. BOOKING SUMMARY REPORT
   */
  @RequirePermission('reports.view')
  @Get('booking-summary')
  @ApiOperation({ summary: 'Get booking summary report' })
  @ApiQuery({ name: 'wedding_group_uuid', required: false })
  @ApiQuery({ name: 'date_range', required: false, enum: DateRangeType })
  @ApiQuery({ name: 'date_from', required: false })
  @ApiQuery({ name: 'date_to', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Booking summary report' })
  async getBookingSummary(@Query() query: ReportQueryDto, @Req() req: any) {
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const report = await this.reportsService.getBookingSummary(query, filterAdminId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Booking summary report generated successfully',
      data: report,
    };
  }

  /**
   * 2. PAYMENT STATUS REPORT
   */
  @RequirePermission('reports.view')
  @Get('payment-status')
  @ApiOperation({ summary: 'Get payment status report' })
  @ApiQuery({ name: 'wedding_group_uuid', required: false })
  @ApiQuery({ name: 'date_range', required: false, enum: DateRangeType })
  @ApiQuery({ name: 'date_from', required: false })
  @ApiQuery({ name: 'date_to', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Payment status report' })
  async getPaymentStatusReport(@Query() query: ReportQueryDto, @Req() req: any) {
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const report = await this.reportsService.getPaymentStatusReport(query, filterAdminId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Payment status report generated successfully',
      data: report,
    };
  }

  /**
   * 3. REVENUE REPORT
   */
  @RequirePermission('reports.view')
  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue report' })
  @ApiQuery({ name: 'wedding_group_uuid', required: false })
  @ApiQuery({ name: 'date_range', required: false, enum: DateRangeType })
  @ApiQuery({ name: 'date_from', required: false })
  @ApiQuery({ name: 'date_to', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Revenue report' })
  async getRevenueReport(@Query() query: ReportQueryDto, @Req() req: any) {
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const report = await this.reportsService.getRevenueReport(query, filterAdminId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Revenue report generated successfully',
      data: report,
    };
  }

  /**
   * 4. TRANSACTION REPORT (Accounting)
   */
  @RequirePermission('reports.view')
  @Get('transactions')
  @ApiOperation({ summary: 'Get transaction report for accounting' })
  @ApiQuery({ name: 'wedding_group_uuid', required: false })
  @ApiQuery({ name: 'date_range', required: false, enum: DateRangeType })
  @ApiQuery({ name: 'date_from', required: false })
  @ApiQuery({ name: 'date_to', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Transaction report' })
  async getTransactionReport(@Query() query: ReportQueryDto, @Req() req: any) {
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const report = await this.reportsService.getTransactionReport(query, filterAdminId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Transaction report generated successfully',
      data: report,
    };
  }

  /**
   * 5. GUEST-LEVEL REPORT
   */
  @RequirePermission('reports.view')
  @Get('guests')
  @ApiOperation({ summary: 'Get guest-level report' })
  @ApiQuery({ name: 'wedding_group_uuid', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Guest-level report' })
  async getGuestReport(@Query() query: ReportQueryDto, @Req() req: any) {
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const report = await this.reportsService.getGuestReport(query, filterAdminId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Guest report generated successfully',
      data: report,
    };
  }

  /**
   * HOTEL MANIFEST
   */
  @RequirePermission('reports.view')
  @Get('hotel-manifest/:weddingGroupUuid')
  @ApiOperation({ summary: 'Get hotel manifest for a wedding group' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Hotel manifest' })
  async getHotelManifest(
    @Param('weddingGroupUuid') weddingGroupUuid: string,
    @Req() req: any,
  ) {
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const manifest = await this.reportsService.getHotelManifest(weddingGroupUuid, filterAdminId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Hotel manifest generated successfully',
      data: manifest,
    };
  }

  // ==================== CSV EXPORTS ====================

  /**
   * Export Booking Summary as CSV
   */
  @RequirePermission('reports.export')
  @Get('booking-summary/export')
  @ApiOperation({ summary: 'Export booking summary as CSV' })
  @ApiQuery({ name: 'wedding_group_uuid', required: false })
  @ApiQuery({ name: 'date_range', required: false, enum: DateRangeType })
  @ApiResponse({ status: HttpStatus.OK, description: 'CSV file' })
  async exportBookingSummary(
    @Query() query: ReportQueryDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const report = await this.reportsService.getBookingSummary(query, filterAdminId);

    // Build CSV
    const headers = ['Wedding Group', 'Hotel', 'Invited', 'Booked', 'Total Guests', 'Adults', 'Children', 'Bookings', 'Booking Rate (%)'];
    const rows = report.by_group.map(g => [
      g.couple_names,
      g.hotel_name,
      g.invited,
      g.booked,
      g.total_guests,
      g.adults,
      g.children,
      g.bookings,
      g.booking_rate,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(v => `"${v}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=booking-summary-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  }

  /**
   * Export Payment Status as CSV
   */
  @RequirePermission('reports.export')
  @Get('payment-status/export')
  @ApiOperation({ summary: 'Export payment status as CSV' })
  @ApiQuery({ name: 'wedding_group_uuid', required: false })
  @ApiQuery({ name: 'date_range', required: false, enum: DateRangeType })
  @ApiResponse({ status: HttpStatus.OK, description: 'CSV file' })
  async exportPaymentStatus(
    @Query() query: ReportQueryDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const report = await this.reportsService.getPaymentStatusReport(query, filterAdminId);

    // Build CSV
    const headers = ['Booking Ref', 'Guest Name', 'Email', 'Phone', 'Wedding Group', 'Hotel', 'Total Amount', 'Collected', 'Outstanding', 'Status', 'Deposit Paid', 'Final Paid', 'Created At (Hotel TZ)'];
    const rows = report.bookings.map(b => [
      b.booking_reference,
      b.guest_name,
      b.guest_email || '',
      b.guest_phone || '',
      b.couple_names,
      b.hotel_name,
      b.total_amount,
      b.amount_collected,
      b.outstanding,
      b.payment_status,
      b.deposit_paid ? 'Yes' : 'No',
      b.final_paid ? 'Yes' : 'No',
      formatDateForExport(b.created_at, b.timezone),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(v => `"${v}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=payment-status-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  }

  /**
   * Export Revenue Report as CSV
   */
  @RequirePermission('reports.export')
  @Get('revenue/export')
  @ApiOperation({ summary: 'Export revenue report as CSV' })
  @ApiQuery({ name: 'wedding_group_uuid', required: false })
  @ApiQuery({ name: 'date_range', required: false, enum: DateRangeType })
  @ApiResponse({ status: HttpStatus.OK, description: 'CSV file' })
  async exportRevenueReport(
    @Query() query: ReportQueryDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const report = await this.reportsService.getRevenueReport(query, filterAdminId);

    // Build CSV - By Wedding
    const headers = ['Wedding Group', 'Hotel', 'Group Manager', 'Gross Revenue', 'Collected', 'Pending', 'Refunded', 'Net Revenue', 'Bookings'];
    const rows = report.by_wedding.map(w => [
      w.couple_names,
      w.hotel_name,
      w.group_manager,
      w.gross_revenue,
      w.collected_revenue,
      w.pending_revenue,
      w.refunded,
      w.net_revenue,
      w.booking_count,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(v => `"${v}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=revenue-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  }

  /**
   * Export Transaction Report as CSV
   */
  @RequirePermission('reports.export')
  @Get('transactions/export')
  @ApiOperation({ summary: 'Export transaction report as CSV' })
  @ApiQuery({ name: 'wedding_group_uuid', required: false })
  @ApiQuery({ name: 'date_range', required: false, enum: DateRangeType })
  @ApiResponse({ status: HttpStatus.OK, description: 'CSV file' })
  async exportTransactionReport(
    @Query() query: ReportQueryDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const report = await this.reportsService.getTransactionReport(query, filterAdminId);

    // Build CSV
    const headers = ['Date (Hotel TZ)', 'Type', 'Amount', 'Currency', 'Payment Type', 'Gateway', 'Stripe Payment Intent', 'Stripe Transaction ID', 'Booking Ref', 'Guest Name', 'Guest Email', 'Wedding Group', 'Status', 'Refund Reason'];
    const rows = report.transactions.map(t => [
      formatDateForExport(t.date, t.timezone),
      t.type,
      t.amount,
      t.currency,
      t.payment_type || '',
      t.payment_gateway || '',
      t.stripe_payment_intent_id || '',
      t.stripe_transaction_id || '',
      t.booking_reference,
      t.guest_name,
      t.guest_email || '',
      t.couple_names,
      t.status,
      t.refund_reason || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(v => `"${v}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=transactions-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  }

  /**
   * Export Guest Report as CSV
   */
  @RequirePermission('reports.export')
  @Get('guests/export')
  @ApiOperation({ summary: 'Export guest report as CSV' })
  @ApiQuery({ name: 'wedding_group_uuid', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'CSV file' })
  async exportGuestReport(
    @Query() query: ReportQueryDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const report = await this.reportsService.getGuestReport(query, filterAdminId);

    // Build CSV
    const headers = ['Guest Name', 'Email', 'Phone', 'Relationship', 'Side', 'Wedding Group', 'Hotel', 'Has Booked', 'Booking Ref', 'Booking Amount', 'Total Paid', 'Refunded', 'Outstanding', 'Status'];
    const rows = report.guests.map(g => [
      g.full_name,
      g.email || '',
      g.phone || '',
      g.relationship || '',
      g.side || '',
      g.couple_names,
      g.hotel_name,
      g.has_booked ? 'Yes' : 'No',
      g.booking_reference || '',
      g.booking_amount,
      g.total_paid,
      g.total_refunded,
      g.outstanding,
      g.guest_status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(v => `"${v}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=guest-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  }

  /**
   * Export Hotel Manifest as CSV
   */
  @RequirePermission('reports.export')
  @Get('hotel-manifest/:weddingGroupUuid/export')
  @ApiOperation({ summary: 'Export hotel manifest as CSV' })
  @ApiResponse({ status: HttpStatus.OK, description: 'CSV file' })
  async exportHotelManifest(
    @Param('weddingGroupUuid') weddingGroupUuid: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const manifest = await this.reportsService.getHotelManifest(weddingGroupUuid, filterAdminId);

    // Build CSV
    const headers = ['Booking Ref', 'Guest Name', 'Email', 'Phone', 'Check-in', 'Check-out', 'Adults', 'Children', 'Room Types', 'Special Requests', 'Status'];
    const rows = manifest.manifest.map(m => [
      m.booking_reference,
      m.guest_name,
      m.guest_email || '',
      m.guest_phone || '',
      m.check_in_date,
      m.check_out_date,
      m.adults,
      m.children,
      m.rooms.map((r: any) => `${r.quantity}x ${r.room_type}`).join('; '),
      m.special_requests || '',
      m.status,
    ]);

    const csvContent = [
      `Hotel: ${manifest.wedding_group.hotel.name}`,
      `Wedding: ${manifest.wedding_group.couple_names}`,
      `Wedding Date: ${manifest.wedding_group.wedding_date}`,
      `Total Guests: ${manifest.total_guests}`,
      `Total Rooms: ${manifest.total_rooms}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(v => `"${v}"`).join(',')),
    ].join('\n');

    const safeCoupleName = manifest.wedding_group.couple_names.replace(/[^a-zA-Z0-9]/g, '-');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=hotel-manifest-${safeCoupleName}-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  }
}
