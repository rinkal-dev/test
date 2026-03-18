import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PublicPaymentsService } from '../public/payments/public-payments.service';

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(private readonly publicPaymentsService: PublicPaymentsService) {}

  /**
   * Process payments with missing invoices every 5 minutes
   * This is a safety net to catch any payments where:
   * 1. Stripe webhook failed to arrive
   * 2. Stripe webhook was delayed
   * 3. Invoice generation failed during webhook processing
   * 4. getPaymentStatus wasn't called by the frontend
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleMissingInvoices() {
    this.logger.log('Running missing invoices check...');

    try {
      const result = await this.publicPaymentsService.processMissingInvoices();

      if (result.processed > 0) {
        this.logger.log(
          `Missing invoices processed: ${result.processed} total, ${result.succeeded} succeeded, ${result.failed} failed`,
        );
      } else {
        this.logger.debug('No missing invoices found');
      }
    } catch (error) {
      this.logger.error(`Error processing missing invoices: ${error.message}`);
    }
  }

  /**
   * Manual trigger for missing invoice processing (can be called via admin API)
   */
  async triggerMissingInvoicesCheck(): Promise<{ processed: number; succeeded: number; failed: number }> {
    this.logger.log('Manual missing invoices check triggered');
    return this.publicPaymentsService.processMissingInvoices();
  }
}
