import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { paymentsProviders } from './payments.provider';
import { PublicPaymentsModule } from 'src/modules/public/payments/public-payments.module';
import { CancellationPoliciesModule } from 'src/modules/admin/cancellation-policies/cancellation-policies.module';
import { EventsModule } from 'src/modules/events/events.module';
import { RefundNotificationService } from 'src/modules/public/guest-bookings/refund-notification.service';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [PublicPaymentsModule, CancellationPoliciesModule, EventsModule, ActivityLogsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, RefundNotificationService, ...paymentsProviders],
  exports: [PaymentsService],
})
export class PaymentsModule {}
