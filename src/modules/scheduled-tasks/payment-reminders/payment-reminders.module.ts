/**
 * ============================================
 * PAYMENT REMINDERS MODULE
 * ============================================
 *
 * Handles scheduled payment reminder emails as a fallback
 * when N8N is not active.
 */

import { Module } from '@nestjs/common';
import { PaymentRemindersService } from './payment-reminders.service';
import {
  BOOKINGS_REPOSITORY,
  PAYMENTS_REPOSITORY,
} from 'src/config/constants';
import { Bookings, Payments } from 'src/models';

@Module({
  providers: [
    PaymentRemindersService,
    {
      provide: BOOKINGS_REPOSITORY,
      useValue: Bookings,
    },
    {
      provide: PAYMENTS_REPOSITORY,
      useValue: Payments,
    },
  ],
  exports: [PaymentRemindersService],
})
export class PaymentRemindersModule {}
