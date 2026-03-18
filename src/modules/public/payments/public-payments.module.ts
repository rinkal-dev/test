import { Module } from '@nestjs/common';
import { PublicPaymentsController } from './public-payments.controller';
import { PublicPaymentsService } from './public-payments.service';
import { StripeService } from './stripe.service';
import { publicPaymentsProviders } from './public-payments.provider';
import { InvoicesModule } from '../../admin/invoices/invoices.module';
import { EventsModule } from '../../events/events.module';
import { BookingConfirmationsModule } from '../booking-confirmations/booking-confirmations.module';

@Module({
  imports: [InvoicesModule, EventsModule, BookingConfirmationsModule],
  controllers: [PublicPaymentsController],
  providers: [
    PublicPaymentsService,
    StripeService,
    ...publicPaymentsProviders,
  ],
  exports: [PublicPaymentsService, StripeService],
})
export class PublicPaymentsModule {}
