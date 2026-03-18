import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Headers,
  RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { PublicPaymentsService } from './public-payments.service';
import { StripeService } from './stripe.service';
import { CreatePaymentIntentDto } from './dto/CreatePaymentIntentDto';

@ApiTags('Public Payments')
@Controller({ version: '1', path: 'public/payments' })
export class PublicPaymentsController {
  constructor(
    private readonly publicPaymentsService: PublicPaymentsService,
    private readonly stripeService: StripeService,
  ) {}

  @Post('create-intent')
  @ApiOperation({ summary: 'Create a Stripe PaymentIntent for booking payment' })
  @ApiResponse({ status: 201, description: 'PaymentIntent created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async createPaymentIntent(@Body() dto: CreatePaymentIntentDto) {
    const result = await this.publicPaymentsService.createPaymentIntent(dto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'PaymentIntent created successfully',
      data: result,
    };
  }

  @Get(':uuid/status')
  @ApiOperation({ summary: 'Get payment status' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentStatus(@Param('uuid') uuid: string) {
    const result = await this.publicPaymentsService.getPaymentStatus(uuid);
    return {
      statusCode: HttpStatus.OK,
      message: 'Payment status retrieved',
      data: result,
    };
  }

  @Get('config')
  @ApiOperation({ summary: 'Get Stripe publishable key for frontend' })
  @ApiResponse({ status: 200, description: 'Config retrieved' })
  getConfig() {
    return {
      statusCode: HttpStatus.OK,
      message: 'Config retrieved',
      data: {
        publishable_key: this.publicPaymentsService.getPublishableKey(),
      },
    };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook handler' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
    @Res() res: Response,
  ) {
    try {
      if (!req.rawBody) {
        return res.status(400).json({ error: 'Missing raw body' });
      }

      const event = this.stripeService.constructWebhookEvent(req.rawBody, signature);
      await this.publicPaymentsService.handleWebhookEvent(event);

      return res.status(200).json({ received: true });
    } catch (err) {
      console.error('Webhook error:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }
  }

  @Post(':uuid/retry-invoice')
  @ApiOperation({ summary: 'Retry invoice generation for a successful payment' })
  @ApiResponse({ status: 200, description: 'Invoice generation attempted' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async retryInvoiceGeneration(@Param('uuid') uuid: string) {
    const result = await this.publicPaymentsService.retryInvoiceGeneration(uuid);
    return {
      statusCode: result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST,
      message: result.message,
      data: result,
    };
  }

  @Get('missing-invoices/check')
  @ApiOperation({ summary: 'Get payments that have missing invoices' })
  @ApiResponse({ status: 200, description: 'Missing invoices list retrieved' })
  async getMissingInvoices() {
    const payments = await this.publicPaymentsService.getPaymentsWithMissingInvoices();
    return {
      statusCode: HttpStatus.OK,
      message: `Found ${payments.length} payments with missing invoices`,
      data: payments.map((p) => ({
        uuid: p.uuid,
        payment_type: p.payment_type,
        amount: p.amount,
        status: p.status,
        paid_at: p.paid_at,
        invoice_generation_attempts: p.invoice_generation_attempts,
        invoice_generation_error: p.invoice_generation_error,
      })),
    };
  }

  @Post('missing-invoices/process')
  @ApiOperation({ summary: 'Process all payments with missing invoices' })
  @ApiResponse({ status: 200, description: 'Missing invoices processed' })
  async processMissingInvoices() {
    const result = await this.publicPaymentsService.processMissingInvoices();
    return {
      statusCode: HttpStatus.OK,
      message: `Processed ${result.processed} payments: ${result.succeeded} succeeded, ${result.failed} failed`,
      data: result,
    };
  }
}
