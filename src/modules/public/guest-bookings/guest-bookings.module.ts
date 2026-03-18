/**
 * Guest Bookings Module
 *
 * Provides guest booking management functionality including
 * cancellation preview and refund requests.
 */
import { Module } from '@nestjs/common';
import { GuestBookingsController } from './guest-bookings.controller';
import { GuestBookingsService } from './guest-bookings.service';
import { RefundNotificationService } from './refund-notification.service';
import { guestBookingsProviders } from './guest-bookings.provider';
import { CancellationPoliciesModule } from 'src/modules/admin/cancellation-policies/cancellation-policies.module';
import { EventsModule } from 'src/modules/events/events.module';
import { GuestAuthModule } from 'src/modules/public/guest-auth/guest-auth.module';

@Module({
  imports: [
    GuestAuthModule,
    CancellationPoliciesModule,
    EventsModule,
  ],
  controllers: [GuestBookingsController],
  providers: [...guestBookingsProviders, GuestBookingsService, RefundNotificationService],
  exports: [GuestBookingsService, RefundNotificationService],
})
export class GuestBookingsModule {}
