import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { ExternalApiService } from './external-api.service';
import { PaymentRemindersService } from '../scheduled-tasks/payment-reminders/payment-reminders.service';
import { ApiKeyGuard, RequirePermission } from '../admin/api-keys/api-key.guard';
import {
  PaymentDueQueryDto,
  BookingsQueryDto,
  CheckinReminderQueryDto,
  LogPaymentReminderDto,
} from './dto/ExternalApiQueryDto';

@ApiTags('External API (for N8N)')
@ApiHeader({
  name: 'X-API-Key',
  description: 'API key for authentication',
  required: true,
})
@UseGuards(ApiKeyGuard)
@Controller('v1/external')
export class ExternalApiController {
  constructor(
    private readonly externalApiService: ExternalApiService,
    private readonly paymentRemindersService: PaymentRemindersService,
  ) {}

  @Get('bookings')
  @RequirePermission('external:bookings')
  @ApiOperation({ summary: 'Get bookings with filters' })
  @ApiResponse({ status: 200, description: 'List of bookings' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async getBookings(@Query() query: BookingsQueryDto) {
    return this.externalApiService.getBookings(query);
  }

  @Get('bookings/payment-due')
  @RequirePermission('external:bookings')
  @ApiOperation({ summary: 'Get bookings with payment due within specified days' })
  @ApiResponse({ status: 200, description: 'List of bookings with payment due' })
  async getPaymentDueBookings(@Query() query: PaymentDueQueryDto) {
    return this.externalApiService.getBookingsPaymentDue(query);
  }

  @Get('bookings/upcoming-checkins')
  @RequirePermission('external:bookings')
  @ApiOperation({ summary: 'Get bookings with upcoming check-in dates' })
  @ApiResponse({ status: 200, description: 'List of upcoming check-ins' })
  async getUpcomingCheckins(@Query() query: CheckinReminderQueryDto) {
    return this.externalApiService.getUpcomingCheckins(query);
  }

  @Get('bookings/:reference')
  @RequirePermission('external:bookings')
  @ApiOperation({ summary: 'Get booking by reference number' })
  @ApiResponse({ status: 200, description: 'Booking details' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async getBookingByReference(@Param('reference') reference: string) {
    return this.externalApiService.getBookingByReference(reference);
  }

  @Get('weddings/:slug/guests')
  @RequirePermission('external:guests')
  @ApiOperation({ summary: 'Get guest list for a wedding' })
  @ApiResponse({ status: 200, description: 'Guest list' })
  @ApiResponse({ status: 404, description: 'Wedding not found' })
  async getWeddingGuests(@Param('slug') slug: string) {
    return this.externalApiService.getWeddingGuests(slug);
  }

  @Get('weddings/:slug/rooms')
  @RequirePermission('external:weddings')
  @ApiOperation({ summary: 'Get room availability for a wedding' })
  @ApiResponse({ status: 200, description: 'Room availability' })
  @ApiResponse({ status: 404, description: 'Wedding not found' })
  async getWeddingRooms(@Param('slug') slug: string) {
    return this.externalApiService.getWeddingRooms(slug);
  }

  /**
   * Log payment reminder sent by N8N
   * This prevents the backend fallback from sending duplicate reminders
   */
  @Post('payment-reminders/log')
  @RequirePermission('external:bookings')
  @ApiOperation({ summary: 'Log payment reminder sent by N8N' })
  @ApiResponse({ status: 200, description: 'Reminder logged successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async logPaymentReminder(@Body() dto: LogPaymentReminderDto) {
    return this.paymentRemindersService.logReminderFromN8N(
      dto.booking_reference,
      dto.reminder_type,
    );
  }

  /**
   * Manually trigger payment reminders (for testing)
   */
  @Post('payment-reminders/trigger')
  @RequirePermission('external:bookings')
  @ApiOperation({ summary: 'Manually trigger payment reminders' })
  @ApiResponse({ status: 200, description: 'Reminders triggered' })
  async triggerPaymentReminders() {
    return this.paymentRemindersService.triggerManually();
  }
}
