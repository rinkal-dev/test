import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { EventType } from './event-types';
import { WebhookEvent } from './interfaces/webhook-event.interface';
import { WebhookDispatcherService } from '../webhooks/webhook-dispatcher.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @Inject(forwardRef(() => WebhookDispatcherService))
    private readonly webhookDispatcher: WebhookDispatcherService,
  ) {}

  /**
   * Emit an event to all subscribed webhooks
   * @param eventType - The type of event
   * @param payload - The event data
   */
  async emit(eventType: EventType | string, payload: any): Promise<void> {
    const event: WebhookEvent = {
      event: eventType,
      timestamp: new Date().toISOString(),
      id: `evt_${uuidv4().replace(/-/g, '')}`,
      data: payload,
    };

    this.logger.log(`Emitting event: ${eventType} (${event.id})`);

    try {
      // Dispatch to all registered webhooks
      await this.webhookDispatcher.dispatch(event);
    } catch (error) {
      this.logger.error(`Failed to dispatch event ${eventType}: ${error.message}`);
      // Don't throw - event emission shouldn't break the main flow
    }
  }

  /**
   * Emit a booking event
   */
  async emitBookingEvent(eventType: EventType, bookingData: any): Promise<void> {
    await this.emit(eventType, bookingData);
  }

  /**
   * Emit a payment event
   */
  async emitPaymentEvent(eventType: EventType, paymentData: any): Promise<void> {
    await this.emit(eventType, paymentData);
  }

  /**
   * Emit a guest event
   */
  async emitGuestEvent(eventType: EventType, guestData: any): Promise<void> {
    await this.emit(eventType, guestData);
  }

  /**
   * Emit a wedding event
   */
  async emitWeddingEvent(eventType: EventType, weddingData: any): Promise<void> {
    await this.emit(eventType, weddingData);
  }

  /**
   * Emit an inventory event
   */
  async emitInventoryEvent(eventType: EventType, inventoryData: any): Promise<void> {
    await this.emit(eventType, inventoryData);
  }

  /**
   * Emit an invoice event
   */
  async emitInvoiceEvent(eventType: EventType, invoiceData: any): Promise<void> {
    await this.emit(eventType, invoiceData);
  }
}
