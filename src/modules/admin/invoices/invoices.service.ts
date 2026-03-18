import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  IInvoiceRepository,
  INVOICE_REPOSITORY,
  IInvoice,
  IInvoiceWithRelations,
  InvoiceStats,
  InvoiceType,
  InvoiceStatus,
} from '../../../core/repositories/invoice.repository.interface';
import { BOOKINGS_REPOSITORY, PAYMENTS_REPOSITORY } from '../../../config/constants';
import { Bookings } from '../../../models/Bookings';
import { Payments } from '../../../models/Payments';
import { CreateInvoiceDto, GenerateInvoiceForBookingDto } from './dto/CreateInvoiceDto';
import { UpdateInvoiceDto, UpdateInvoiceStatusDto, MarkInvoicePaidDto } from './dto/UpdateInvoiceDto';
import { InvoiceQueryDto } from './dto/InvoiceQueryDto';

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly invoiceRepository: IInvoiceRepository,
    @Inject(BOOKINGS_REPOSITORY)
    private readonly bookingsModel: typeof Bookings,
    @Inject(PAYMENTS_REPOSITORY)
    private readonly paymentsModel: typeof Payments,
  ) {}

  /**
   * Generate invoice for a booking
   */
  async generateInvoice(
    bookingUuid: string,
    dto: GenerateInvoiceForBookingDto,
  ): Promise<IInvoice> {
    // Find booking
    const booking = await this.bookingsModel.findOne({
      where: { uuid: bookingUuid },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check if invoice of this type already exists
    const hasExisting = await this.invoiceRepository.hasInvoiceOfType(
      booking.id,
      dto.invoice_type,
    );

    if (hasExisting) {
      throw new ConflictException(
        `${dto.invoice_type} invoice already exists for this booking`,
      );
    }

    // Calculate amounts based on invoice type
    let subtotal: number;
    let taxAmount: number;
    let amount: number;

    if (dto.invoice_type === 'deposit') {
      // Use deposit_amount from booking
      subtotal = Number(booking.deposit_amount) || 0;
      taxAmount = 0; // Deposits typically don't have separate tax
      amount = subtotal;
    } else {
      // Final invoice = total - deposit
      const totalAmount = Number(booking.total_amount) || 0;
      const depositPaid = Number(booking.deposit_amount) || 0;
      subtotal = totalAmount - depositPaid;

      // Calculate tax (assuming 15% is already included in total)
      // Or you could recalculate from line items
      taxAmount = 0; // Adjust based on your tax calculation logic
      amount = subtotal;
    }

    // Generate invoice number
    const invoiceNumber = await this.invoiceRepository.generateInvoiceNumber();

    // Create invoice
    const invoice = await this.invoiceRepository.create({
      booking_id: booking.id,
      invoice_number: invoiceNumber,
      invoice_type: dto.invoice_type,
      subtotal,
      tax_amount: taxAmount,
      amount,
      currency: booking.currency || 'USD',
      status: dto.auto_issue !== false ? 'issued' : 'draft',
      due_date: dto.due_date || null,
      issued_at: dto.auto_issue !== false ? new Date() : null,
      notes: dto.notes || null,
    });

    return invoice;
  }

  /**
   * Create invoice manually
   */
  async create(dto: CreateInvoiceDto): Promise<IInvoice> {
    // Find booking
    const booking = await this.bookingsModel.findOne({
      where: { uuid: dto.booking_uuid },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check if invoice of this type already exists
    const hasExisting = await this.invoiceRepository.hasInvoiceOfType(
      booking.id,
      dto.invoice_type,
    );

    if (hasExisting) {
      throw new ConflictException(
        `${dto.invoice_type} invoice already exists for this booking`,
      );
    }

    // Generate invoice number
    const invoiceNumber = await this.invoiceRepository.generateInvoiceNumber();

    // Create invoice
    const invoice = await this.invoiceRepository.create({
      booking_id: booking.id,
      invoice_number: invoiceNumber,
      invoice_type: dto.invoice_type,
      subtotal: dto.subtotal,
      tax_amount: dto.tax_amount || 0,
      amount: dto.amount,
      currency: dto.currency || 'USD',
      status: dto.status || 'draft',
      due_date: dto.due_date || null,
      issued_at: dto.status === 'issued' ? new Date() : null,
      notes: dto.notes || null,
    });

    return invoice;
  }

  /**
   * Get all invoices with filters
   * @param query - Query parameters
   * @param filterAdminId - Admin ID for data-level filtering (null = no filter)
   */
  async findAll(
    query: InvoiceQueryDto,
    filterAdminId?: number | null,
  ): Promise<{ data: IInvoiceWithRelations[]; total: number; page: number; limit: number }> {
    const { rows, count } = await this.invoiceRepository.findAllWithFilters({
      booking_uuid: query.booking_uuid,
      status: query.status as InvoiceStatus,
      invoice_type: query.invoice_type as InvoiceType,
      currency: query.currency,
      from_date: query.from_date,
      to_date: query.to_date,
      search: query.search,
      page: query.page || 1,
      limit: query.limit || 20,
      sort_by: query.sort_by,
      sort_order: query.sort_order,
      filterAdminId,
    });

    return {
      data: rows,
      total: count,
      page: query.page || 1,
      limit: query.limit || 20,
    };
  }

  /**
   * Get invoice by UUID
   */
  async findByUuid(uuid: string): Promise<IInvoiceWithRelations> {
    const invoice = await this.invoiceRepository.findByUuidWithRelations(uuid);

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  /**
   * Get invoice by invoice number
   */
  async findByInvoiceNumber(invoiceNumber: string): Promise<IInvoice> {
    const invoice = await this.invoiceRepository.findByInvoiceNumber(invoiceNumber);

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  /**
   * Get invoices for a booking
   */
  async findByBookingUuid(bookingUuid: string): Promise<IInvoice[]> {
    return this.invoiceRepository.findByBookingUuid(bookingUuid);
  }

  /**
   * Update invoice
   */
  async update(uuid: string, dto: UpdateInvoiceDto): Promise<IInvoice> {
    const existing = await this.invoiceRepository.findByUuid(uuid);

    if (!existing) {
      throw new NotFoundException('Invoice not found');
    }

    // Cannot update cancelled or paid invoices
    if (existing.status === 'cancelled' || existing.status === 'paid') {
      throw new BadRequestException(
        `Cannot update ${existing.status} invoice`,
      );
    }

    const updateData: any = { ...dto };

    // If status changed to issued, set issued_at
    if (dto.status === 'issued' && existing.status !== 'issued') {
      updateData.issued_at = new Date();
    }

    await this.invoiceRepository.update(uuid, updateData);

    return this.invoiceRepository.findByUuid(uuid);
  }

  /**
   * Update invoice status
   */
  async updateStatus(uuid: string, dto: UpdateInvoiceStatusDto): Promise<IInvoice> {
    const existing = await this.invoiceRepository.findByUuid(uuid);

    if (!existing) {
      throw new NotFoundException('Invoice not found');
    }

    // Validate status transitions
    this.validateStatusTransition(existing.status as InvoiceStatus, dto.status);

    await this.invoiceRepository.updateStatus(uuid, dto.status);

    return this.invoiceRepository.findByUuid(uuid);
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(uuid: string, dto: MarkInvoicePaidDto): Promise<IInvoice> {
    const existing = await this.invoiceRepository.findByUuid(uuid);

    if (!existing) {
      throw new NotFoundException('Invoice not found');
    }

    if (existing.status === 'paid') {
      throw new BadRequestException('Invoice is already paid');
    }

    if (existing.status === 'cancelled') {
      throw new BadRequestException('Cannot pay a cancelled invoice');
    }

    let paymentId: number | null = null;

    // Link to payment if provided
    if (dto.payment_uuid) {
      const payment = await this.paymentsModel.findOne({
        where: { uuid: dto.payment_uuid },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      paymentId = payment.id;
    }

    if (paymentId) {
      await this.invoiceRepository.markAsPaid(uuid, paymentId);
    } else {
      await this.invoiceRepository.updateStatus(uuid, 'paid');
    }

    return this.invoiceRepository.findByUuid(uuid);
  }

  /**
   * Cancel invoice
   */
  async cancel(uuid: string): Promise<IInvoice> {
    const existing = await this.invoiceRepository.findByUuid(uuid);

    if (!existing) {
      throw new NotFoundException('Invoice not found');
    }

    if (existing.status === 'paid') {
      throw new BadRequestException('Cannot cancel a paid invoice');
    }

    await this.invoiceRepository.updateStatus(uuid, 'cancelled');

    return this.invoiceRepository.findByUuid(uuid);
  }

  /**
   * Delete invoice (only draft)
   */
  async delete(uuid: string): Promise<void> {
    const existing = await this.invoiceRepository.findByUuid(uuid);

    if (!existing) {
      throw new NotFoundException('Invoice not found');
    }

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be deleted');
    }

    await this.invoiceRepository.delete(uuid);
  }

  /**
   * Get invoice statistics
   */
  async getStats(weddingGroupId?: number): Promise<InvoiceStats> {
    return this.invoiceRepository.getStats(weddingGroupId);
  }

  /**
   * Update PDF URL after generation
   */
  async updatePdfUrl(uuid: string, pdfUrl: string): Promise<void> {
    const existing = await this.invoiceRepository.findByUuid(uuid);

    if (!existing) {
      throw new NotFoundException('Invoice not found');
    }

    await this.invoiceRepository.updatePdfUrl(uuid, pdfUrl);
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(
    currentStatus: InvoiceStatus,
    newStatus: InvoiceStatus,
  ): void {
    const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      draft: ['issued', 'cancelled'],
      issued: ['paid', 'cancelled'],
      paid: [], // Cannot change from paid
      cancelled: [], // Cannot change from cancelled
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Cannot change status from ${currentStatus} to ${newStatus}`,
      );
    }
  }
}
