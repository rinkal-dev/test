import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { PublicPaymentsModule } from '../public/payments/public-payments.module';
import { PaymentRemindersModule } from './payment-reminders/payment-reminders.module';

@Module({
  imports: [ScheduleModule.forRoot(), PublicPaymentsModule, PaymentRemindersModule],
  providers: [ScheduledTasksService],
  exports: [ScheduledTasksService, PaymentRemindersModule],
})
export class ScheduledTasksModule {}
