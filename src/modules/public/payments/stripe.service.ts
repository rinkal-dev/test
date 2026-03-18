import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { getEnvironmentData } from '../../../helpers/general';

@Injectable()
export class StripeService {
  private _stripe: Stripe | null = null;
  private _lastSecretKey: string | null = null;
  private _lastMode: string | null = null;
  private readonly logger = new Logger(StripeService.name);

  /**
   * Get current Stripe mode (test or live)
   */
  getStripeMode(): 'test' | 'live' {
    const mode = getEnvironmentData('STRIPE_MODE') || 'test';
    return mode === 'live' ? 'live' : 'test';
  }

  /**
   * Get the appropriate secret key based on current mode
   */
  private getSecretKey(): string | undefined {
    const mode = this.getStripeMode();
    if (mode === 'live') {
      return getEnvironmentData('STRIPE_LIVE_SECRET_KEY');
    }
    return getEnvironmentData('STRIPE_TEST_SECRET_KEY');
  }

  /**
   * Get the appropriate webhook secret based on current mode
   */
  private getWebhookSecret(): string | undefined {
    const mode = this.getStripeMode();
    if (mode === 'live') {
      return getEnvironmentData('STRIPE_LIVE_WEBHOOK_SECRET');
    }
    return getEnvironmentData('STRIPE_TEST_WEBHOOK_SECRET');
  }

  /**
   * Get Stripe instance with current settings
   * Re-initializes if secret key or mode has changed (supports dynamic settings updates)
   */
  private getStripe(): Stripe {
    const mode = this.getStripeMode();
    const secretKey = this.getSecretKey();

    // Re-initialize Stripe if secret key or mode changed
    if (!this._stripe || this._lastSecretKey !== secretKey || this._lastMode !== mode) {
      if (!secretKey) {
        this.logger.warn(`STRIPE_${mode.toUpperCase()}_SECRET_KEY not configured - Stripe payments will not work`);
      }
      this._stripe = new Stripe(secretKey || 'sk_test_placeholder', {
        apiVersion: '2025-12-15.clover',
      });
      this._lastSecretKey = secretKey || null;
      this._lastMode = mode;
      this.logger.log(`Stripe instance initialized in ${mode.toUpperCase()} mode`);
    }

    return this._stripe;
  }

  /**
   * Create a PaymentIntent for a booking payment
   */
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    bookingUuid: string;
    bookingReference: string;
    customerEmail: string;
    customerName: string;
    paymentType: 'deposit' | 'final';
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    const { amount, currency, bookingUuid, bookingReference, customerEmail, customerName, paymentType, description, metadata } = params;

    // Convert amount to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await this.getStripe().paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      metadata: {
        booking_uuid: bookingUuid,
        booking_reference: bookingReference,
        payment_type: paymentType,
        customer_email: customerEmail,
        customer_name: customerName,
        ...metadata,
      },
      description: description || `${paymentType === 'deposit' ? 'Deposit' : 'Final'} payment for booking ${bookingReference}`,
      receipt_email: customerEmail,
      // Explicitly set payment methods (excludes Link to remove "Save my information" section)
      payment_method_types: ['card'],
    });

    this.logger.log(`Created PaymentIntent ${paymentIntent.id} for booking ${bookingReference}, amount: ${amount} ${currency}`);

    return paymentIntent;
  }

  /**
   * Retrieve a PaymentIntent by ID
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.getStripe().paymentIntents.retrieve(paymentIntentId);
  }

  /**
   * Cancel a PaymentIntent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.getStripe().paymentIntents.cancel(paymentIntentId);
  }

  /**
   * Create a refund for a PaymentIntent
   */
  async createRefund(params: {
    paymentIntentId: string;
    amount?: number; // In currency unit (not cents), leave empty for full refund
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    metadata?: Record<string, string>;
  }): Promise<Stripe.Refund> {
    const { paymentIntentId, amount, reason, metadata } = params;

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
      reason: reason || 'requested_by_customer',
      metadata,
    };

    if (amount !== undefined) {
      refundParams.amount = Math.round(amount * 100);
    }

    const refund = await this.getStripe().refunds.create(refundParams);
    this.logger.log(`Created refund ${refund.id} for PaymentIntent ${paymentIntentId}`);

    return refund;
  }

  /**
   * Construct and verify a webhook event
   */
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.getWebhookSecret();
    const mode = this.getStripeMode();
    if (!webhookSecret) {
      throw new Error(`STRIPE_${mode.toUpperCase()}_WEBHOOK_SECRET not configured`);
    }
    return this.getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
  }

  /**
   * Get publishable key for frontend based on current mode
   */
  getPublishableKey(): string {
    const mode = this.getStripeMode();
    if (mode === 'live') {
      return getEnvironmentData('STRIPE_LIVE_PUBLISHABLE_KEY') || '';
    }
    return getEnvironmentData('STRIPE_TEST_PUBLISHABLE_KEY') || '';
  }

  /**
   * Check if Stripe is properly configured for the current mode
   */
  isConfigured(): { configured: boolean; mode: 'test' | 'live'; missing: string[] } {
    const mode = this.getStripeMode();
    const missing: string[] = [];

    const publishableKey = this.getPublishableKey();
    const secretKey = this.getSecretKey();
    const webhookSecret = this.getWebhookSecret();

    if (!publishableKey) missing.push(`STRIPE_${mode.toUpperCase()}_PUBLISHABLE_KEY`);
    if (!secretKey) missing.push(`STRIPE_${mode.toUpperCase()}_SECRET_KEY`);
    if (!webhookSecret) missing.push(`STRIPE_${mode.toUpperCase()}_WEBHOOK_SECRET`);

    return {
      configured: missing.length === 0,
      mode,
      missing,
    };
  }
}
