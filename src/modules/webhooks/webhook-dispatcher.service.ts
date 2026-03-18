import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import {
  WEBHOOKS_REPOSITORY,
  WEBHOOK_DELIVERY_LOGS_REPOSITORY,
} from 'src/config/constants';
import { Webhooks, WebhookDeliveryLogs } from 'src/models';
import { WebhookEvent } from 'src/modules/events/interfaces/webhook-event.interface';
import { eventMatches } from 'src/modules/events/event-types';
import { Op } from 'sequelize';

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(WEBHOOKS_REPOSITORY)
    private webhooksRepository: typeof Webhooks,
    @Inject(WEBHOOK_DELIVERY_LOGS_REPOSITORY)
    private deliveryLogsRepository: typeof WebhookDeliveryLogs,
  ) {}

  /**
   * Dispatch an event to all subscribed webhooks
   */
  async dispatch(event: WebhookEvent): Promise<void> {
    // Find all active webhooks
    const webhooks = await this.webhooksRepository.findAll({
      where: {
        is_active: true,
        deleted_at: null,
      },
    });

    // Filter webhooks that are subscribed to this event
    const subscribedWebhooks = webhooks.filter((webhook) =>
      webhook.events.some((pattern: string) => eventMatches(event.event, pattern)),
    );

    if (subscribedWebhooks.length === 0) {
      this.logger.debug(`No webhooks subscribed to event: ${event.event}`);
      return;
    }

    this.logger.log(
      `Dispatching event ${event.event} to ${subscribedWebhooks.length} webhook(s)`,
    );

    // Send to each webhook in parallel
    await Promise.allSettled(
      subscribedWebhooks.map((webhook) => this.sendWebhook(webhook, event)),
    );
  }

  /**
   * Send webhook to a specific endpoint
   */
  private async sendWebhook(
    webhook: Webhooks,
    event: WebhookEvent,
    attemptNumber: number = 1,
  ): Promise<void> {
    const startTime = Date.now();
    const signature = this.generateSignature(event, webhook.secret_key);
    const deliveryId = `del_${uuidv4().replace(/-/g, '')}`;

    // Create initial log entry
    const log = await this.deliveryLogsRepository.create({
      uuid: uuidv4(),
      webhook_id: webhook.id,
      event_type: event.event,
      payload: event,
      status: 'pending',
      attempt_number: attemptNumber,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post(webhook.url, event, {
          headers: {
            'Content-Type': 'application/json',
            'X-DestaPay-Signature': signature,
            'X-DestaPay-Event': event.event,
            'X-DestaPay-Delivery': deliveryId,
            'X-DestaPay-Timestamp': event.timestamp,
          },
          timeout: webhook.timeout_ms,
        }),
      );

      const duration = Date.now() - startTime;

      // Update log as success
      await this.deliveryLogsRepository.update(
        {
          status: 'success',
          response_status: response.status,
          response_body: JSON.stringify(response.data).substring(0, 1000),
          duration_ms: duration,
        },
        { where: { id: log.id } },
      );

      // Update webhook last triggered timestamp
      await this.webhooksRepository.update(
        { last_triggered_at: new Date() },
        { where: { id: webhook.id } },
      );

      this.logger.log(
        `Webhook delivered successfully: ${webhook.name} (${duration}ms)`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;

      // Update log as failed
      await this.deliveryLogsRepository.update(
        {
          status: 'failed',
          error_message: error.message,
          response_status: error.response?.status,
          response_body: error.response?.data
            ? JSON.stringify(error.response.data).substring(0, 1000)
            : null,
          duration_ms: duration,
        },
        { where: { id: log.id } },
      );

      this.logger.error(
        `Webhook delivery failed: ${webhook.name} - ${error.message}`,
      );

      // Queue for retry if attempts remaining
      if (attemptNumber < webhook.retry_count) {
        await this.queueRetry(webhook, event, attemptNumber + 1, log.id);
      }
    }
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: any, secret: string): string {
    const timestamp = payload.timestamp;
    const data = `${timestamp}.${JSON.stringify(payload)}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(data);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Queue a retry for failed webhook delivery
   */
  private async queueRetry(
    webhook: Webhooks,
    event: WebhookEvent,
    attemptNumber: number,
    previousLogId: number,
  ): Promise<void> {
    // Exponential backoff: 1min, 5min, 15min, 30min, 60min
    const delays = [60000, 300000, 900000, 1800000, 3600000];
    const delay = delays[attemptNumber - 2] || delays[delays.length - 1];

    const retryAt = new Date(Date.now() + delay);

    // Update previous log with retry info
    await this.deliveryLogsRepository.update(
      { next_retry_at: retryAt },
      { where: { id: previousLogId } },
    );

    this.logger.log(
      `Webhook retry scheduled: ${webhook.name} attempt ${attemptNumber} at ${retryAt.toISOString()}`,
    );

    // Schedule retry (in production, use a proper job queue like Bull)
    setTimeout(() => {
      this.sendWebhook(webhook, event, attemptNumber);
    }, delay);
  }

  /**
   * Send a test event to verify webhook configuration
   */
  async sendTestEvent(webhookId: number): Promise<any> {
    const webhook = await this.webhooksRepository.findByPk(webhookId);

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const testEvent: WebhookEvent = {
      event: 'test.ping',
      timestamp: new Date().toISOString(),
      id: `evt_test_${uuidv4().replace(/-/g, '')}`,
      data: {
        message: 'This is a test webhook event from DestaPay',
        webhook_name: webhook.name,
        test: true,
      },
    };

    const startTime = Date.now();
    const signature = this.generateSignature(testEvent, webhook.secret_key);

    try {
      const response = await firstValueFrom(
        this.httpService.post(webhook.url, testEvent, {
          headers: {
            'Content-Type': 'application/json',
            'X-DestaPay-Signature': signature,
            'X-DestaPay-Event': testEvent.event,
            'X-DestaPay-Delivery': testEvent.id,
            'X-DestaPay-Timestamp': testEvent.timestamp,
          },
          timeout: webhook.timeout_ms,
        }),
      );

      return {
        success: true,
        status: response.status,
        duration_ms: Date.now() - startTime,
        response: response.data,
      };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status,
        duration_ms: Date.now() - startTime,
        error: error.message,
        response: error.response?.data,
      };
    }
  }

  /**
   * Process pending retries (called by scheduled task)
   */
  async processPendingRetries(): Promise<void> {
    const pendingRetries = await this.deliveryLogsRepository.findAll({
      where: {
        status: 'failed',
        next_retry_at: {
          [Op.lte]: new Date(),
          [Op.not]: null,
        },
      },
      include: [{ model: Webhooks, as: 'webhook' }],
      limit: 100,
    });

    for (const log of pendingRetries) {
      if (log.webhook && log.webhook.is_active) {
        const event = log.payload as WebhookEvent;
        await this.sendWebhook(log.webhook, event, log.attempt_number + 1);

        // Clear the next_retry_at
        await this.deliveryLogsRepository.update(
          { next_retry_at: null },
          { where: { id: log.id } },
        );
      }
    }
  }
}
