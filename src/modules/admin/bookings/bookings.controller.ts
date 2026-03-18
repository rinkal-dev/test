import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { BookingsService } from './bookings.service';
import { BookingEmailService } from './booking-email.service';
import { CreateBookingDto } from './dto/CreateBookingDto';
import { UpdateBookingDto } from './dto/UpdateBookingDto';
import { BookingQueryDto } from './dto/BookingQueryDto';
import { getDataFilterAdminId, hasFullDataAccess } from 'src/helpers/data-ownership.helper';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@ApiTags('Admin - Bookings')
@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard, PermissionGuard)
@Controller({ version: '1', path: 'bookings' })
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly bookingEmailService: BookingEmailService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  @RequirePermission('bookings.view')
  @Get()
  @ApiOperation({ summary: 'Get all bookings with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'wedding_group_uuid', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'deposit_paid', 'confirmed', 'completed', 'cancelled'] })
  @ApiQuery({ name: 'date_from', required: false, type: String })
  @ApiQuery({ name: 'date_to', required: false, type: String })
  @ApiQuery({ name: 'sort_by', required: false, type: String })
  @ApiQuery({ name: 'sort_order', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of bookings' })
  async getAllBookings(@Query() queries: BookingQueryDto, @Req() req: any) {
    // Data-level filtering: Non-super users only see bookings for their wedding groups
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const result = await this.bookingsService.getAllBookings(queries, filterAdminId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Bookings fetched successfully',
      data: {
        bookings: result.rows,
        total: result.count,
        page: Number(queries.page) || 1,
        limit: Number(queries.limit) || 10,
      },
    };
  }

  @RequirePermission('bookings.view')
  @Get('stats/:weddingGroupUuid')
  @ApiOperation({ summary: 'Get booking statistics for a wedding group' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Booking statistics' })
  async getBookingStats(@Param('weddingGroupUuid') weddingGroupUuid: string, @Req() req: any) {
    // Data-level filtering: Check ownership of wedding group
    const admin = req.user;
    const filterAdminId = getDataFilterAdminId(admin);

    const stats = await this.bookingsService.getBookingStats(weddingGroupUuid, filterAdminId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Booking statistics fetched successfully',
      data: stats,
    };
  }

  @RequirePermission('bookings.view')
  @Get('reference/:reference')
  @ApiOperation({ summary: 'Get booking by reference number' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Booking details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Booking not found' })
  async getBookingByReference(@Param('reference') reference: string, @Req() req: any) {
    const booking = await this.bookingsService.getBookingByReference(reference);

    // Data-level filtering: Check ownership
    const admin = req.user;
    if (!hasFullDataAccess(admin) && booking?.wedding_group?.created_by !== admin.id) {
      return {
        statusCode: HttpStatus.FORBIDDEN,
        message: 'You do not have permission to view this booking',
      };
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'Booking fetched successfully',
      data: booking,
    };
  }

  @RequirePermission('bookings.view')
  @Get(':uuid')
  @ApiOperation({ summary: 'Get booking by UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Booking details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Booking not found' })
  async getBooking(@Param('uuid') uuid: string, @Req() req: any) {
    const booking = await this.bookingsService.getBookingByUuid(uuid);

    // Data-level filtering: Check ownership
    const admin = req.user;
    if (!hasFullDataAccess(admin) && booking?.wedding_group?.created_by !== admin.id) {
      return {
        statusCode: HttpStatus.FORBIDDEN,
        message: 'You do not have permission to view this booking',
      };
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'Booking fetched successfully',
      data: booking,
    };
  }

  @RequirePermission('bookings.create')
  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Booking created' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Wedding group or guest not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Not enough rooms available' })
  async createBooking(@Body() createDto: CreateBookingDto, @Req() req: any, @Ip() ip: string) {
    const booking = await this.bookingsService.createBooking(createDto);

    // Log activity
    await this.activityLogsService.logActivity({
      adminId: req.user?.id,
      action: 'CREATE',
      entityType: 'booking',
      entityId: booking.uuid,
      entityName: booking.booking_reference,
      description: `Created booking ${booking.booking_reference} for guest`,
      ipAddress: ip,
      metadata: { booking_reference: booking.booking_reference },
    });

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Booking created successfully',
      data: booking,
    };
  }

  @RequirePermission('bookings.create')
  @Post('calculate-price')
  @ApiOperation({ summary: 'Calculate price breakdown for a booking (preview)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Price breakdown' })
  async calculatePriceBreakdown(
    @Body()
    body: {
      wedding_group_uuid: string;
      check_in_date: string;
      check_out_date: string;
      rooms: Array<{ room_block_uuid: string; quantity: number }>;
      addons?: Array<{ addon_uuid: string; quantity: number }>;
    },
  ) {
    const breakdown = await this.bookingsService.calculatePriceBreakdown(
      body.wedding_group_uuid,
      body.check_in_date,
      body.check_out_date,
      body.rooms,
      body.addons,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Price breakdown calculated successfully',
      data: breakdown,
    };
  }

  @RequirePermission('bookings.edit')
  @Patch(':uuid')
  @ApiOperation({ summary: 'Update a booking' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Booking updated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Booking not found' })
  async updateBooking(
    @Param('uuid') uuid: string,
    @Body() updateDto: UpdateBookingDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    // Data-level filtering: Check ownership before update
    const existingBooking = await this.bookingsService.getBookingByUuid(uuid);
    const admin = req.user;
    if (!hasFullDataAccess(admin) && existingBooking?.wedding_group?.created_by !== admin.id) {
      return {
        statusCode: HttpStatus.FORBIDDEN,
        message: 'You do not have permission to edit this booking',
      };
    }

    const booking = await this.bookingsService.updateBooking(uuid, updateDto);

    // Log activity
    await this.activityLogsService.logActivity({
      adminId: req.user?.id,
      action: 'UPDATE',
      entityType: 'booking',
      entityId: uuid,
      entityName: existingBooking?.booking_reference,
      description: `Updated booking ${existingBooking?.booking_reference}`,
      ipAddress: ip,
      metadata: { changes: Object.keys(updateDto) },
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'Booking updated successfully',
      data: booking,
    };
  }

  @RequirePermission('bookings.edit')
  @Patch(':uuid/status')
  @ApiOperation({ summary: 'Update booking status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Status updated' })
  async updateStatus(
    @Param('uuid') uuid: string,
    @Body('status') status: string,
    @Req() req: any,
  ) {
    // Data-level filtering: Check ownership
    const existingBooking = await this.bookingsService.getBookingByUuid(uuid);
    const admin = req.user;
    if (!hasFullDataAccess(admin) && existingBooking?.wedding_group?.created_by !== admin.id) {
      return {
        statusCode: HttpStatus.FORBIDDEN,
        message: 'You do not have permission to update this booking',
      };
    }

    const booking = await this.bookingsService.updateBooking(uuid, { status: status as any });
    return {
      statusCode: HttpStatus.OK,
      message: `Booking status updated to ${status}`,
      data: booking,
    };
  }

  @RequirePermission('bookings.edit')
  @Patch(':uuid/cancel')
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Booking cancelled' })
  async cancelBooking(
    @Param('uuid') uuid: string,
    @Body('cancellation_reason') reason: string,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    // Data-level filtering: Check ownership
    const existingBooking = await this.bookingsService.getBookingByUuid(uuid);
    const admin = req.user;
    if (!hasFullDataAccess(admin) && existingBooking?.wedding_group?.created_by !== admin.id) {
      return {
        statusCode: HttpStatus.FORBIDDEN,
        message: 'You do not have permission to cancel this booking',
      };
    }

    const booking = await this.bookingsService.updateBooking(uuid, {
      status: 'cancelled' as any,
      cancellation_reason: reason,
    });

    // Log activity
    await this.activityLogsService.logActivity({
      adminId: req.user?.id,
      action: 'CANCEL',
      entityType: 'booking',
      entityId: uuid,
      entityName: existingBooking?.booking_reference,
      description: `Cancelled booking ${existingBooking?.booking_reference}`,
      ipAddress: ip,
      metadata: { reason },
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'Booking cancelled successfully',
      data: booking,
    };
  }

  @RequirePermission('bookings.delete')
  @Delete(':uuid')
  @ApiOperation({ summary: 'Delete a booking (soft delete)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Booking deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Booking not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Cannot delete completed/cancelled booking' })
  async deleteBooking(@Param('uuid') uuid: string, @Req() req: any, @Ip() ip: string) {
    // Data-level filtering: Check ownership
    const existingBooking = await this.bookingsService.getBookingByUuid(uuid);
    const admin = req.user;
    if (!hasFullDataAccess(admin) && existingBooking?.wedding_group?.created_by !== admin.id) {
      return {
        statusCode: HttpStatus.FORBIDDEN,
        message: 'You do not have permission to delete this booking',
      };
    }

    const result = await this.bookingsService.deleteBooking(uuid);

    // Log activity
    await this.activityLogsService.logActivity({
      adminId: req.user?.id,
      action: 'DELETE',
      entityType: 'booking',
      entityId: uuid,
      entityName: existingBooking?.booking_reference,
      description: `Deleted booking ${existingBooking?.booking_reference}`,
      ipAddress: ip,
    });

    return {
      statusCode: HttpStatus.OK,
      message: result.message,
    };
  }

  // ==================== INTERNAL NOTES ====================

  @RequirePermission('bookings.edit')
  @Post(':uuid/notes')
  @ApiOperation({ summary: 'Add internal note to booking' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Note added' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Booking not found' })
  async addInternalNote(
    @Param('uuid') uuid: string,
    @Body('text') text: string,
    @Req() req: any,
  ) {
    // Data-level filtering: Check ownership
    const existingBooking = await this.bookingsService.getBookingByUuid(uuid);
    const admin = req.user;
    if (!hasFullDataAccess(admin) && existingBooking?.wedding_group?.created_by !== admin.id) {
      return {
        statusCode: HttpStatus.FORBIDDEN,
        message: 'You do not have permission to add notes to this booking',
      };
    }

    const adminId = req.user?.id || 0;
    const adminName = req.user?.name || req.user?.email || 'Admin';
    const booking = await this.bookingsService.addInternalNote(uuid, adminId, adminName, text);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Note added successfully',
      data: booking,
    };
  }

  @RequirePermission('bookings.edit')
  @Delete(':uuid/notes/:noteId')
  @ApiOperation({ summary: 'Delete internal note from booking' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Note deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Booking or note not found' })
  async deleteInternalNote(
    @Param('uuid') uuid: string,
    @Param('noteId') noteId: string,
    @Req() req: any,
  ) {
    // Data-level filtering: Check ownership
    const existingBooking = await this.bookingsService.getBookingByUuid(uuid);
    const admin = req.user;
    if (!hasFullDataAccess(admin) && existingBooking?.wedding_group?.created_by !== admin.id) {
      return {
        statusCode: HttpStatus.FORBIDDEN,
        message: 'You do not have permission to modify this booking',
      };
    }

    const booking = await this.bookingsService.deleteInternalNote(uuid, noteId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Note deleted successfully',
      data: booking,
    };
  }

  // ==================== MODIFY ROOMS ====================

  @RequirePermission('bookings.edit')
  @Patch(':uuid/rooms')
  @ApiOperation({ summary: 'Update booking rooms and recalculate totals' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Rooms updated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Booking not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot modify cancelled/completed booking' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Not enough rooms available' })
  async updateBookingRooms(
    @Param('uuid') uuid: string,
    @Body('rooms') rooms: Array<{ room_block_uuid: string; quantity: number; adults_per_room?: number; children_per_room?: number }>,
    @Req() req: any,
  ) {
    // Data-level filtering: Check ownership
    const existingBooking = await this.bookingsService.getBookingByUuid(uuid);
    const admin = req.user;
    if (!hasFullDataAccess(admin) && existingBooking?.wedding_group?.created_by !== admin.id) {
      return {
        statusCode: HttpStatus.FORBIDDEN,
        message: 'You do not have permission to modify this booking',
      };
    }

    const booking = await this.bookingsService.updateBookingRooms(uuid, rooms);
    return {
      statusCode: HttpStatus.OK,
      message: 'Booking rooms updated successfully',
      data: booking,
    };
  }

  // ==================== MODIFY ADDONS ====================

  @RequirePermission('bookings.edit')
  @Patch(':uuid/addons')
  @ApiOperation({ summary: 'Update booking addons and recalculate totals' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Addons updated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Booking not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot modify cancelled/completed booking' })
  async updateBookingAddons(
    @Param('uuid') uuid: string,
    @Body('addons') addons: Array<{ addon_uuid: string; quantity: number }>,
    @Req() req: any,
  ) {
    // Data-level filtering: Check ownership
    const existingBooking = await this.bookingsService.getBookingByUuid(uuid);
    const admin = req.user;
    if (!hasFullDataAccess(admin) && existingBooking?.wedding_group?.created_by !== admin.id) {
      return {
        statusCode: HttpStatus.FORBIDDEN,
        message: 'You do not have permission to modify this booking',
      };
    }

    const booking = await this.bookingsService.updateBookingAddons(uuid, addons);
    return {
      statusCode: HttpStatus.OK,
      message: 'Booking addons updated successfully',
      data: booking,
    };
  }

  // ==================== EMAIL NOTIFICATIONS ====================

  @RequirePermission('bookings.edit')
  @Post(':uuid/send-reminder')
  @ApiOperation({ summary: 'Send payment reminder email to guest' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Email sent' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Booking not found' })
  async sendPaymentReminder(@Param('uuid') uuid: string, @Req() req: any) {
    // Data-level filtering: Check ownership
    const existingBooking = await this.bookingsService.getBookingByUuid(uuid);
    const admin = req.user;
    if (!hasFullDataAccess(admin) && existingBooking?.wedding_group?.created_by !== admin.id) {
      return {
        statusCode: HttpStatus.FORBIDDEN,
        message: 'You do not have permission to send emails for this booking',
      };
    }

    const result = await this.bookingEmailService.sendPaymentReminder(uuid);
    return {
      statusCode: result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST,
      message: result.message,
      data: { success: result.success },
    };
  }

  @RequirePermission('bookings.edit')
  @Post(':uuid/send-details')
  @ApiOperation({ summary: 'Send booking details email to guest' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Email sent' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Booking not found' })
  async sendBookingDetails(@Param('uuid') uuid: string, @Req() req: any) {
    // Data-level filtering: Check ownership
    const existingBooking = await this.bookingsService.getBookingByUuid(uuid);
    const admin = req.user;
    if (!hasFullDataAccess(admin) && existingBooking?.wedding_group?.created_by !== admin.id) {
      return {
        statusCode: HttpStatus.FORBIDDEN,
        message: 'You do not have permission to send emails for this booking',
      };
    }

    const result = await this.bookingEmailService.sendBookingDetails(uuid);
    return {
      statusCode: result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST,
      message: result.message,
      data: { success: result.success },
    };
  }
}
