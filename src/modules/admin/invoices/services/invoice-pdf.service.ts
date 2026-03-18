import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import {
  IInvoiceRepository,
  INVOICE_REPOSITORY,
  IInvoiceWithRelations,
} from '../../../../core/repositories/invoice.repository.interface';

interface InvoicePdfData {
  invoice: IInvoiceWithRelations;
  companyInfo?: {
    name: string;
    address: string;
    city: string;
    country: string;
    email: string;
    phone: string;
  };
}

@Injectable()
export class InvoicePdfService {
  private readonly uploadsPath: string;
  private readonly invoicesPath: string;

  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly invoiceRepository: IInvoiceRepository,
  ) {
    const basePath = process.env.VERCEL ? '/tmp' : process.cwd();
    this.uploadsPath = path.join(basePath, 'uploads');
    this.invoicesPath = path.join(this.uploadsPath, 'invoices');
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.invoicesPath)) {
      fs.mkdirSync(this.invoicesPath, { recursive: true });
    }
  }

  /**
   * Generate PDF for an invoice
   */
  async generatePdf(invoiceUuid: string): Promise<{ buffer: Buffer; filename: string }> {
    const invoice = await this.invoiceRepository.findByUuidWithRelations(invoiceUuid);

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const pdfData: InvoicePdfData = {
      invoice,
      companyInfo: {
        name: 'DestaPay Group Travel',
        address: '123 Wedding Ave',
        city: 'New York, NY 10001',
        country: 'United States',
        email: 'support@destapay.com',
        phone: '+1 (555) 123-4567',
      },
    };

    const buffer = await this.createPdfBuffer(pdfData);
    const filename = `${invoice.invoice_number}.pdf`;

    return { buffer, filename };
  }

  /**
   * Generate and save PDF to disk
   */
  async generateAndSavePdf(invoiceUuid: string): Promise<string> {
    const invoice = await this.invoiceRepository.findByUuidWithRelations(invoiceUuid);

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const pdfData: InvoicePdfData = {
      invoice,
      companyInfo: {
        name: 'DestaPay Group Travel',
        address: '123 Wedding Ave',
        city: 'New York, NY 10001',
        country: 'United States',
        email: 'support@destapay.com',
        phone: '+1 (555) 123-4567',
      },
    };

    const buffer = await this.createPdfBuffer(pdfData);
    const filename = `${invoice.invoice_number}.pdf`;
    const filePath = path.join(this.invoicesPath, filename);

    fs.writeFileSync(filePath, buffer);

    // Return relative URL for storage
    const pdfUrl = `/uploads/invoices/${filename}`;

    // Update invoice with PDF URL
    await this.invoiceRepository.updatePdfUrl(invoiceUuid, pdfUrl);

    return pdfUrl;
  }

  /**
   * Create PDF buffer
   */
  private createPdfBuffer(data: InvoicePdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const { invoice, companyInfo } = data;
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      this.drawHeader(doc, companyInfo);

      // Invoice Title
      this.drawInvoiceTitle(doc, invoice);

      // Billing Info
      this.drawBillingInfo(doc, invoice);

      // Invoice Details Table
      this.drawInvoiceDetails(doc, invoice);

      // Totals
      this.drawTotals(doc, invoice);

      // Footer
      this.drawFooter(doc, invoice);

      doc.end();
    });
  }

  private drawHeader(doc: PDFKit.PDFDocument, companyInfo: InvoicePdfData['companyInfo']): void {
    // Company Name
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(companyInfo.name, 50, 50);

    // Company Address
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(companyInfo.address, 50, 75)
      .text(companyInfo.city, 50, 88)
      .text(companyInfo.country, 50, 101);

    // Company Contact
    doc
      .text(`Email: ${companyInfo.email}`, 400, 75, { align: 'right' })
      .text(`Phone: ${companyInfo.phone}`, 400, 88, { align: 'right' });

    // Horizontal line
    doc
      .moveTo(50, 125)
      .lineTo(545, 125)
      .stroke();
  }

  private drawInvoiceTitle(doc: PDFKit.PDFDocument, invoice: IInvoiceWithRelations): void {
    const y = 145;
    const invoiceTypeLabel = invoice.invoice_type === 'deposit' ? 'DEPOSIT INVOICE' : 'FINAL INVOICE';

    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(invoiceTypeLabel, 50, y);

    doc
      .fontSize(12)
      .font('Helvetica')
      .text(`Invoice Number: ${invoice.invoice_number}`, 50, y + 35)
      .text(`Issue Date: ${this.formatDate(invoice.issued_at)}`, 50, y + 50)
      .text(`Due Date: ${invoice.due_date ? this.formatDate(invoice.due_date) : 'Due on Receipt'}`, 50, y + 65);

    // Status badge
    const statusColors = {
      draft: '#6B7280',
      issued: '#3B82F6',
      paid: '#10B981',
      cancelled: '#EF4444',
    };
    const statusColor = statusColors[invoice.status] || '#6B7280';

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(statusColor)
      .text(`Status: ${invoice.status.toUpperCase()}`, 400, y + 35, { align: 'right' })
      .fillColor('#000000');
  }

  private drawBillingInfo(doc: PDFKit.PDFDocument, invoice: IInvoiceWithRelations): void {
    const y = 250;

    // Bill To section
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('BILL TO:', 50, y);

    doc
      .fontSize(11)
      .font('Helvetica')
      .text(invoice.booking?.guest?.name || 'Guest', 50, y + 18)
      .text(invoice.booking?.guest?.email || '', 50, y + 33);

    if (invoice.booking?.guest?.phone) {
      doc.text(invoice.booking.guest.phone, 50, y + 48);
    }

    // Booking Reference section
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('BOOKING DETAILS:', 300, y);

    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`Reference: ${invoice.booking?.booking_reference || 'N/A'}`, 300, y + 18)
      .text(`Check-in: ${this.formatDate(invoice.booking?.check_in_date)}`, 300, y + 33)
      .text(`Check-out: ${this.formatDate(invoice.booking?.check_out_date)}`, 300, y + 48);

    // Wedding Group / Event Details
    if (invoice.booking?.wedding_group) {
      const wg = invoice.booking.wedding_group;

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('EVENT:', 50, y + 80);

      let eventY = y + 98;

      // Couple names (primary identifier)
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`${wg.bride_name} & ${wg.groom_name}`, 50, eventY);
      eventY += 15;

      // Event dates
      if (wg.event_start_date) {
        const eventDates =
          wg.event_start_date === wg.event_end_date
            ? this.formatDate(wg.event_start_date)
            : `${this.formatDate(wg.event_start_date)} - ${this.formatDate(wg.event_end_date)}`;
        doc.text(`Event Date: ${eventDates}`, 50, eventY);
        eventY += 15;
      }

      // Hotel/Venue
      if (wg.hotel) {
        doc.text(`Venue: ${wg.hotel.name}`, 50, eventY);
        eventY += 15;
        doc
          .fontSize(10)
          .fillColor('#6B7280')
          .text(`${wg.hotel.city}, ${wg.hotel.country}`, 50, eventY)
          .fillColor('#000000');
      }
    }
  }

  private drawInvoiceDetails(doc: PDFKit.PDFDocument, invoice: IInvoiceWithRelations): void {
    const tableTop = 430; // Adjusted to accommodate expanded event details section
    const col1 = 50;
    const col2 = 350;
    const col3 = 450;

    // Table Header
    doc
      .fillColor('#F3F4F6')
      .rect(col1, tableTop, 495, 25)
      .fill();

    doc
      .fillColor('#000000')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('Description', col1 + 10, tableTop + 8)
      .text('Type', col2, tableTop + 8)
      .text('Amount', col3, tableTop + 8, { align: 'right', width: 85 });

    // Table Row
    const rowY = tableTop + 35;
    const description =
      invoice.invoice_type === 'deposit'
        ? 'Booking Deposit Payment'
        : 'Final Balance Payment';

    doc
      .fontSize(11)
      .font('Helvetica')
      .text(description, col1 + 10, rowY)
      .text(invoice.invoice_type.charAt(0).toUpperCase() + invoice.invoice_type.slice(1), col2, rowY)
      .text(this.formatCurrency(invoice.subtotal, invoice.currency), col3, rowY, {
        align: 'right',
        width: 85,
      });

    // Booking reference row
    doc
      .fontSize(9)
      .fillColor('#6B7280')
      .text(`Booking: ${invoice.booking?.booking_reference || 'N/A'}`, col1 + 10, rowY + 15)
      .fillColor('#000000');

    // Bottom line
    doc
      .moveTo(col1, rowY + 35)
      .lineTo(545, rowY + 35)
      .stroke();
  }

  private drawTotals(doc: PDFKit.PDFDocument, invoice: IInvoiceWithRelations): void {
    const totalsY = 530; // Adjusted to match table position change
    const labelX = 380;
    const valueX = 450;

    // Subtotal
    doc
      .fontSize(11)
      .font('Helvetica')
      .text('Subtotal:', labelX, totalsY, { align: 'right', width: 60 })
      .text(this.formatCurrency(invoice.subtotal, invoice.currency), valueX, totalsY, {
        align: 'right',
        width: 85,
      });

    // Tax (if any)
    if (invoice.tax_amount > 0) {
      doc
        .text('Tax:', labelX, totalsY + 18, { align: 'right', width: 60 })
        .text(this.formatCurrency(invoice.tax_amount, invoice.currency), valueX, totalsY + 18, {
          align: 'right',
          width: 85,
        });
    }

    // Total line
    doc
      .moveTo(labelX - 10, totalsY + 38)
      .lineTo(545, totalsY + 38)
      .stroke();

    // Total
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('TOTAL:', labelX, totalsY + 48, { align: 'right', width: 60 })
      .text(this.formatCurrency(invoice.amount, invoice.currency), valueX, totalsY + 48, {
        align: 'right',
        width: 85,
      });

    // Payment status
    if (invoice.status === 'paid') {
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#10B981')
        .text('PAID', 50, totalsY + 48)
        .fillColor('#000000');
    }
  }

  private drawFooter(doc: PDFKit.PDFDocument, invoice: IInvoiceWithRelations): void {
    const footerY = 680;

    // Notes
    if (invoice.notes) {
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Notes:', 50, footerY);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(invoice.notes, 50, footerY + 15, { width: 495 });
    }

    // Thank you message
    doc
      .fontSize(11)
      .font('Helvetica-Oblique')
      .fillColor('#6B7280')
      .text(
        'Thank you for choosing DestaPay for your group travel needs!',
        50,
        750,
        { align: 'center', width: 495 },
      )
      .fillColor('#000000');

    // Page footer
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#9CA3AF')
      .text(
        `Generated on ${this.formatDate(new Date())} | Invoice ${invoice.invoice_number}`,
        50,
        780,
        { align: 'center', width: 495 },
      )
      .fillColor('#000000');
  }

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

  private formatCurrency(amount: number, currency: string = 'USD'): string {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
    };
    const symbol = symbols[currency] || currency + ' ';
    return `${symbol}${Number(amount).toFixed(2)}`;
  }
}
