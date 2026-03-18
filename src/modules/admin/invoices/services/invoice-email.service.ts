import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { getEnvironmentData } from '../../../../helpers/general';
import {
  IInvoiceRepository,
  INVOICE_REPOSITORY,
  IInvoiceWithRelations,
} from '../../../../core/repositories/invoice.repository.interface';
import { InvoicePdfService } from './invoice-pdf.service';

interface SendInvoiceEmailOptions {
  includePdfAttachment?: boolean;
  customMessage?: string;
}

@Injectable()
export class InvoiceEmailService {
  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly invoiceRepository: IInvoiceRepository,
    private readonly mailerService: MailerService,
    private readonly invoicePdfService: InvoicePdfService,
  ) {}

  /**
   * Send invoice email to guest
   */
  async sendInvoiceEmail(
    invoiceUuid: string,
    options: SendInvoiceEmailOptions = {},
  ): Promise<{ success: boolean; message: string }> {
    const invoice = await this.invoiceRepository.findByUuidWithRelations(invoiceUuid);

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const guestEmail = invoice.booking?.guest?.email;
    const guestName = invoice.booking?.guest?.name;

    if (!guestEmail) {
      throw new BadRequestException('Guest email not found');
    }

    // Generate PDF for attachment if requested
    let attachments = [];
    if (options.includePdfAttachment !== false) {
      try {
        const { buffer, filename } = await this.invoicePdfService.generatePdf(invoiceUuid);
        attachments = [
          {
            filename,
            content: buffer,
            contentType: 'application/pdf',
          },
        ];
      } catch (error) {
        console.error('Failed to generate PDF attachment:', error);
        // Continue without attachment
      }
    }

    // Build email context
    const context = this.buildEmailContext(invoice, options.customMessage);

    // Send email
    try {
      await this.mailerService.sendMail({
        to: guestEmail,
        subject: `Invoice ${invoice.invoice_number} - ${this.getInvoiceTypeLabel(invoice.invoice_type)}`,
        template: 'invoice',
        context,
        attachments,
      });

      return {
        success: true,
        message: `Invoice email sent successfully to ${guestEmail}`,
      };
    } catch (error) {
      console.error('Failed to send invoice email:', error);
      throw new BadRequestException(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Build email context from invoice data
   */
  private buildEmailContext(invoice: IInvoiceWithRelations, customMessage?: string): Record<string, any> {
    const appName = getEnvironmentData('APP_NAME') || 'DestaPay';
    const logoUrl = getEnvironmentData('APP_LOGO_URL') || '';
    const baseUrl = getEnvironmentData('FRONTEND_URL') || getEnvironmentData('APP_URL') || '';
    const guestToken = (invoice.booking as any)?.guest?.access_token;

    // Build PDF download URL
    const pdfDownloadUrl = guestToken
      ? `${baseUrl}/api/v1/public/invoices/${invoice.uuid}/pdf?token=${guestToken}`
      : '';

    // Build manage booking URL
    const manageBookingUrl = guestToken
      ? `${baseUrl}/my-booking?token=${guestToken}`
      : '';

    return {
      appName,
      logoUrl,
      currentYear: new Date().getFullYear(),
      guestName: invoice.booking?.guest?.name || 'Guest',
      guestEmail: invoice.booking?.guest?.email || '',
      invoiceNumber: invoice.invoice_number,
      invoiceType: invoice.invoice_type,
      status: invoice.status,
      subtotal: this.formatNumber(invoice.subtotal),
      taxAmount: this.formatNumber(invoice.tax_amount),
      amount: this.formatNumber(invoice.amount),
      currency: this.getCurrencySymbol(invoice.currency),
      issuedAt: this.formatDate(invoice.issued_at),
      dueDate: invoice.due_date ? this.formatDate(invoice.due_date) : null,
      notes: customMessage || invoice.notes || null,
      bookingReference: invoice.booking?.booking_reference || 'N/A',
      weddingGroupName: invoice.booking?.wedding_group?.name || 'N/A',
      checkInDate: this.formatDate(invoice.booking?.check_in_date),
      checkOutDate: this.formatDate(invoice.booking?.check_out_date),
      pdfDownloadUrl,
      manageBookingUrl,
    };
  }

  /**
   * Get invoice type label
   */
  private getInvoiceTypeLabel(invoiceType: string): string {
    return invoiceType === 'deposit' ? 'Deposit Payment' : 'Final Payment';
  }

  /**
   * Format date for display
   * Handles date-only strings (YYYY-MM-DD) without timezone conversion
   */
  private formatDate(date: Date | string | null): string {
    if (!date) return 'N/A';

    // If it's a date-only string (YYYY-MM-DD), parse it without timezone shift
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    // For full ISO timestamps, use UTC to avoid timezone issues
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }

  /**
   * Format number for display
   */
  private formatNumber(value: number): string {
    return Number(value || 0).toFixed(2);
  }

  /**
   * Get currency symbol
   */
  private getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
    };
    return symbols[currency] || currency;
  }
}
