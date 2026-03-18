/**
 * Event Types for N8N Integration
 * These events are emitted when actions occur in DestaPay
 * and can be subscribed to by webhooks
 */

export enum EventType {
  // Booking events
  BOOKING_CREATED = 'booking.created',
  BOOKING_UPDATED = 'booking.updated',
  BOOKING_CANCELLED = 'booking.cancelled',
  BOOKING_STATUS_CHANGED = 'booking.status_changed',
  BOOKING_CONFIRMED = 'booking.confirmed',

  // Payment events
  PAYMENT_SUCCEEDED = 'payment.succeeded',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',

  // Refund events
  REFUND_REQUESTED = 'refund.requested',
  REFUND_APPROVED = 'refund.approved',
  REFUND_DENIED = 'refund.denied',

  // Guest events
  GUEST_INVITED = 'guest.invited',
  GUEST_REGISTERED = 'guest.registered',
  GUEST_RESPONDED = 'guest.responded',

  // Wedding events
  WEDDING_CREATED = 'wedding.created',
  WEDDING_PUBLISHED = 'wedding.published',
  WEDDING_COMPLETED = 'wedding.completed',

  // Inventory events
  INVENTORY_LOW = 'inventory.low',
  INVENTORY_UPDATED = 'inventory.updated',

  // Invoice events
  INVOICE_GENERATED = 'invoice.generated',
}

export const EVENT_DESCRIPTIONS: Record<EventType, string> = {
  [EventType.BOOKING_CREATED]: 'Triggered when a new booking is submitted',
  [EventType.BOOKING_UPDATED]: 'Triggered when booking details are modified',
  [EventType.BOOKING_CANCELLED]: 'Triggered when a booking is cancelled',
  [EventType.BOOKING_STATUS_CHANGED]: 'Triggered when booking status changes',
  [EventType.BOOKING_CONFIRMED]: 'Triggered when a booking is fully confirmed',

  [EventType.PAYMENT_SUCCEEDED]: 'Triggered when a payment is successful',
  [EventType.PAYMENT_FAILED]: 'Triggered when a payment fails',
  [EventType.PAYMENT_REFUNDED]: 'Triggered when a refund is processed',

  [EventType.REFUND_REQUESTED]: 'Triggered when a guest requests a refund',
  [EventType.REFUND_APPROVED]: 'Triggered when a refund is approved by admin',
  [EventType.REFUND_DENIED]: 'Triggered when a refund is denied by admin',

  [EventType.GUEST_INVITED]: 'Triggered when a guest invitation is sent',
  [EventType.GUEST_REGISTERED]: 'Triggered when a guest completes registration',
  [EventType.GUEST_RESPONDED]: 'Triggered when a guest responds to RSVP',

  [EventType.WEDDING_CREATED]: 'Triggered when a new wedding group is created',
  [EventType.WEDDING_PUBLISHED]: 'Triggered when a wedding is made public',
  [EventType.WEDDING_COMPLETED]: 'Triggered after the event date passes',

  [EventType.INVENTORY_LOW]: 'Triggered when room inventory drops below threshold',
  [EventType.INVENTORY_UPDATED]: 'Triggered when room allocation changes',

  [EventType.INVOICE_GENERATED]: 'Triggered when an invoice is created',
};

export const EVENT_CATEGORIES = {
  booking: [
    EventType.BOOKING_CREATED,
    EventType.BOOKING_UPDATED,
    EventType.BOOKING_CANCELLED,
    EventType.BOOKING_STATUS_CHANGED,
    EventType.BOOKING_CONFIRMED,
  ],
  payment: [
    EventType.PAYMENT_SUCCEEDED,
    EventType.PAYMENT_FAILED,
    EventType.PAYMENT_REFUNDED,
  ],
  refund: [
    EventType.REFUND_REQUESTED,
    EventType.REFUND_APPROVED,
    EventType.REFUND_DENIED,
  ],
  guest: [
    EventType.GUEST_INVITED,
    EventType.GUEST_REGISTERED,
    EventType.GUEST_RESPONDED,
  ],
  wedding: [
    EventType.WEDDING_CREATED,
    EventType.WEDDING_PUBLISHED,
    EventType.WEDDING_COMPLETED,
  ],
  inventory: [
    EventType.INVENTORY_LOW,
    EventType.INVENTORY_UPDATED,
  ],
  invoice: [
    EventType.INVOICE_GENERATED,
  ],
};

// Wildcard support
export const ALL_EVENTS = '*';

/**
 * Check if an event type matches a subscription pattern
 * Supports wildcards like 'booking.*' or '*'
 */
export function eventMatches(eventType: string, pattern: string): boolean {
  if (pattern === ALL_EVENTS) {
    return true;
  }

  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2);
    return eventType.startsWith(prefix + '.');
  }

  return eventType === pattern;
}
