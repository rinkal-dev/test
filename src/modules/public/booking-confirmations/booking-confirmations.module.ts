/**
 * ============================================
 * BOOKING CONFIRMATIONS MODULE
 * ============================================
 *
 * Module for handling booking confirmation emails.
 * Provides email service for sending confirmations after booking creation.
 */

import { Module } from '@nestjs/common';
import { BookingConfirmationEmailService } from './booking-confirmation-email.service';

@Module({
  providers: [BookingConfirmationEmailService],
  exports: [BookingConfirmationEmailService],
})
export class BookingConfirmationsModule {}
