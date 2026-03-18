import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingEmailService } from './booking-email.service';
import { bookingsProviders } from './bookings.provider';
import { EventsModule } from 'src/modules/events/events.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [EventsModule, ActivityLogsModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingEmailService, ...bookingsProviders],
  exports: [BookingsService],
})
export class BookingsModule {}
