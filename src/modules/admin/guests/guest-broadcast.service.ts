/**
 * ============================================
 * GUEST BROADCAST SERVICE
 * ============================================
 *
 * Service for sending bulk communications to wedding guests.
 * Supports Email (implemented) and SMS (placeholder for future).
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { getEnvironmentData } from '../../../helpers/general';
import { BroadcastChannel, BroadcastAudience } from './dto/SendBroadcastDto';

export interface BroadcastRecipient {
  uuid: string;
  name: string;
  email: string;
  phone?: string;
}

export interface BroadcastData {
  channel: BroadcastChannel;
  audience: BroadcastAudience;
  subject?: string;
  message: string;
  weddingGroupName: string;
  recipients: BroadcastRecipient[];
}

export interface BroadcastResult {
  uuid: string;
  name: string;
  contact: string; // email or phone
  success: boolean;
  error?: string;
}

export interface BroadcastResponse {
  channel: BroadcastChannel;
  total: number;
  successful: number;
  failed: number;
  results: BroadcastResult[];
}

@Injectable()
export class GuestBroadcastService {
  private readonly logger = new Logger(GuestBroadcastService.name);

  constructor(private readonly mailerService: MailerService) {}

  /**
   * Send broadcast to guests
   */
  async sendBroadcast(data: BroadcastData): Promise<BroadcastResponse> {
    if (data.channel === BroadcastChannel.EMAIL) {
      return this.sendEmailBroadcast(data);
    } else if (data.channel === BroadcastChannel.SMS) {
      return this.sendSmsBroadcast(data);
    } else {
      throw new BadRequestException(`Unsupported channel: ${data.channel}`);
    }
  }

  /**
   * Send email broadcast
   */
  private async sendEmailBroadcast(data: BroadcastData): Promise<BroadcastResponse> {
    if (!data.subject) {
      throw new BadRequestException('Subject is required for email broadcasts');
    }

    const results: BroadcastResult[] = [];
    let successful = 0;
    let failed = 0;

    const appName = getEnvironmentData('APP_NAME') || 'DestaPay';
    const logoUrl = getEnvironmentData('APP_LOGO_URL') || '';

    this.logger.log(`Starting email broadcast to ${data.recipients.length} recipients`);

    for (const recipient of data.recipients) {
      try {
        await this.mailerService.sendMail({
          to: recipient.email,
          subject: data.subject,
          template: 'guest-broadcast',
          context: {
            appName,
            logoUrl,
            currentYear: new Date().getFullYear(),
            guestName: recipient.name,
            weddingGroupName: data.weddingGroupName,
            subject: data.subject,
            message: data.message,
          },
        });

        results.push({
          uuid: recipient.uuid,
          name: recipient.name,
          contact: recipient.email,
          success: true,
        });
        successful++;

        this.logger.debug(`Broadcast email sent to ${recipient.email}`);

        // Small delay to avoid rate limiting
        await this.delay(100);
      } catch (error) {
        results.push({
          uuid: recipient.uuid,
          name: recipient.name,
          contact: recipient.email,
          success: false,
          error: error.message,
        });
        failed++;

        this.logger.error(`Failed to send broadcast to ${recipient.email}: ${error.message}`);
      }
    }

    this.logger.log(`Email broadcast complete: ${successful} sent, ${failed} failed`);

    return {
      channel: BroadcastChannel.EMAIL,
      total: data.recipients.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Send SMS broadcast (placeholder for future implementation)
   *
   * TODO: Implement SMS provider integration (Twilio, AWS SNS, etc.)
   *
   * To implement:
   * 1. Add SMS provider credentials to .env
   * 2. Install SMS provider SDK (e.g., npm install twilio)
   * 3. Implement the actual SMS sending logic below
   */
  private async sendSmsBroadcast(data: BroadcastData): Promise<BroadcastResponse> {
    const results: BroadcastResult[] = [];
    let successful = 0;
    let failed = 0;

    this.logger.log(`Starting SMS broadcast to ${data.recipients.length} recipients`);

    for (const recipient of data.recipients) {
      if (!recipient.phone) {
        results.push({
          uuid: recipient.uuid,
          name: recipient.name,
          contact: 'N/A',
          success: false,
          error: 'No phone number',
        });
        failed++;
        continue;
      }

      try {
        // ============================================
        // SMS PROVIDER INTEGRATION POINT
        // ============================================
        // Replace the code below with actual SMS provider call
        //
        // Example with Twilio:
        // const twilio = require('twilio')(accountSid, authToken);
        // await twilio.messages.create({
        //   body: data.message,
        //   from: process.env.TWILIO_PHONE_NUMBER,
        //   to: recipient.phone,
        // });
        //
        // Example with AWS SNS:
        // const sns = new AWS.SNS();
        // await sns.publish({
        //   Message: data.message,
        //   PhoneNumber: recipient.phone,
        // }).promise();
        // ============================================

        // For now, throw error indicating SMS is not configured
        throw new Error('SMS provider not configured. Please contact administrator.');

        // When implemented, uncomment below:
        // results.push({
        //   uuid: recipient.uuid,
        //   name: recipient.name,
        //   contact: recipient.phone,
        //   success: true,
        // });
        // successful++;
        // this.logger.debug(`SMS sent to ${recipient.phone}`);
        // await this.delay(100);

      } catch (error) {
        results.push({
          uuid: recipient.uuid,
          name: recipient.name,
          contact: recipient.phone,
          success: false,
          error: error.message,
        });
        failed++;

        this.logger.error(`Failed to send SMS to ${recipient.phone}: ${error.message}`);
      }
    }

    this.logger.log(`SMS broadcast complete: ${successful} sent, ${failed} failed`);

    return {
      channel: BroadcastChannel.SMS,
      total: data.recipients.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
