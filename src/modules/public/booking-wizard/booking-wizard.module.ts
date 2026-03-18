/**
 * ============================================
 * BOOKING WIZARD MODULE
 * ============================================
 *
 * Public module for the guest booking wizard.
 * No authentication required.
 *
 * Uses repository abstraction to support both Sequelize and Supabase.
 */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BookingWizardController } from './booking-wizard.controller';
import { BookingWizardService } from './booking-wizard.service';
import { InventoryHoldService } from './inventory-hold.service';
import {
  BookingWizardRepositoryProvider,
  BookingWizardModelProviders,
} from './booking-wizard.provider';
import { PublicPaymentsModule } from '../payments/public-payments.module';
import { BookingConfirmationsModule } from '../booking-confirmations/booking-confirmations.module';
import { EventsModule } from '../../events/events.module';
import { Payments } from '../../../models/Payments';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PublicPaymentsModule,
    BookingConfirmationsModule,
    EventsModule,
  ],
  controllers: [BookingWizardController],
  providers: [
    BookingWizardService,
    InventoryHoldService,
    BookingWizardRepositoryProvider,
    ...BookingWizardModelProviders,
    {
      provide: 'PAYMENTS_REPOSITORY',
      useValue: Payments,
    },
  ],
  exports: [BookingWizardService, InventoryHoldService],
})
export class BookingWizardModule {}
