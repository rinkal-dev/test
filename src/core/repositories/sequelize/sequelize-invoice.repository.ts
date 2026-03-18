/**
 * ============================================
 * SEQUELIZE INVOICE REPOSITORY
 * ============================================
 *
 * Sequelize implementation of IInvoiceRepository.
 * Handles all invoice database operations using Sequelize ORM.
 */

import { v4 as uuidv4 } from 'uuid';
import { Op, literal } from 'sequelize';
import { Invoices } from '../../../models/Invoices';
import { Bookings } from '../../../models/Bookings';
import { Payments } from '../../../models/Payments';
import { Guests } from '../../../models/Guests';
import { WeddingGroups } from '../../../models/WeddingGroups';
import { Hotels } from '../../../models/Hotels';
import {
  IInvoiceRepository,
  IInvoice,
  ICreateInvoice,
  IUpdateInvoice,
  IInvoiceWithRelations,
  InvoiceQueryOptions,
  InvoiceStats,
  InvoiceType,
  InvoiceStatus,
} from '../invoice.repository.interface';
import { FindOptions, FindAndCountResult } from '../base.repository.interface';

export class SequelizeInvoiceRepository implements IInvoiceRepository {
  constructor(private readonly invoiceModel: typeof Invoices) {}

  /**
   * Create a new invoice
   */
  async create(data: ICreateInvoice): Promise<IInvoice> {
    const invoice = await this.invoiceModel.create({
      uuid: uuidv4(),
      ...data,
    } as any);
    return invoice.get({ plain: true }) as IInvoice;
  }

  /**
   * Find all invoices
   */
  async findAll(options?: FindOptions): Promise<IInvoice[]> {
    const invoices = await this.invoiceModel.findAll({
      where: options?.where,
      attributes: options?.attributes,
      order: options?.order || [['created_at', 'DESC']],
      offset: options?.offset,
      limit: options?.limit,
      raw: options?.raw,
    });
    return invoices.map((inv) => inv.get({ plain: true })) as IInvoice[];
  }

  /**
   * Find all with count for pagination
   */
  async findAndCountAll(options?: FindOptions): Promise<FindAndCountResult<IInvoice>> {
    const result = await this.invoiceModel.findAndCountAll({
      where: options?.where,
      attributes: options?.attributes,
      order: options?.order || [['created_at', 'DESC']],
      offset: options?.offset,
      limit: options?.limit,
      distinct: true,
    });
    return {
      rows: result.rows.map((inv) => inv.get({ plain: true })) as IInvoice[],
      count: result.count,
    };
  }

  /**
   * Find one invoice
   */
  async findOne(options: FindOptions): Promise<IInvoice | null> {
    const invoice = await this.invoiceModel.findOne({
      where: options.where,
      attributes: options.attributes,
    });
    return invoice ? (invoice.get({ plain: true }) as IInvoice) : null;
  }

  /**
   * Find by UUID
   */
  async findByUuid(uuid: string, options?: FindOptions): Promise<IInvoice | null> {
    const invoice = await this.invoiceModel.findOne({
      where: { uuid },
      attributes: options?.attributes,
    });
    return invoice ? (invoice.get({ plain: true }) as IInvoice) : null;
  }

  /**
   * Update invoice by UUID
   */
  async update(uuid: string, data: IUpdateInvoice): Promise<[number]> {
    const [affectedCount] = await this.invoiceModel.update(data as any, {
      where: { uuid },
    });
    return [affectedCount];
  }

  /**
   * Delete invoice by UUID
   */
  async delete(uuid: string): Promise<number> {
    return await this.invoiceModel.destroy({
      where: { uuid },
    });
  }

  /**
   * Count invoices
   */
  async count(options?: { where?: Record<string, any> }): Promise<number> {
    return await this.invoiceModel.count({
      where: options?.where,
    });
  }

  /**
   * Check if invoice exists
   */
  async exists(uuid: string): Promise<boolean> {
    const count = await this.invoiceModel.count({
      where: { uuid },
    });
    return count > 0;
  }

  /**
   * Find by invoice number
   */
  async findByInvoiceNumber(invoiceNumber: string): Promise<IInvoice | null> {
    const invoice = await this.invoiceModel.findOne({
      where: { invoice_number: invoiceNumber },
    });
    return invoice ? (invoice.get({ plain: true }) as IInvoice) : null;
  }

  /**
   * Find invoices by booking ID
   */
  async findByBookingId(bookingId: number): Promise<IInvoice[]> {
    const invoices = await this.invoiceModel.findAll({
      where: { booking_id: bookingId },
      order: [['created_at', 'DESC']],
    });
    return invoices.map((inv) => inv.get({ plain: true })) as IInvoice[];
  }

  /**
   * Find invoices by booking UUID
   */
  async findByBookingUuid(bookingUuid: string): Promise<IInvoice[]> {
    const invoices = await this.invoiceModel.findAll({
      include: [
        {
          model: Bookings,
          as: 'booking',
          where: { uuid: bookingUuid },
          attributes: [],
        },
      ],
      order: [['created_at', 'DESC']],
    });
    return invoices.map((inv) => inv.get({ plain: true })) as IInvoice[];
  }

  /**
   * Find invoice with full relations
   */
  async findByUuidWithRelations(uuid: string): Promise<IInvoiceWithRelations | null> {
    const invoice = await this.invoiceModel.findOne({
      where: { uuid },
      include: [
        {
          model: Bookings,
          as: 'booking',
          attributes: [
            'id',
            'uuid',
            'booking_reference',
            'guest_id',
            'check_in_date',
            'check_out_date',
            'total_amount',
            'status',
          ],
          include: [
            {
              model: Guests,
              as: 'guest',
              attributes: ['uuid', 'name', 'email', 'phone', 'access_token'],
            },
            {
              model: WeddingGroups,
              as: 'wedding_group',
              attributes: ['uuid', 'name', 'bride_name', 'groom_name', 'event_start_date', 'event_end_date', 'created_by'],
              include: [
                {
                  model: Hotels,
                  as: 'hotel',
                  attributes: ['uuid', 'name', 'city', 'country'],
                },
              ],
            },
          ],
        },
        {
          model: Payments,
          as: 'payment',
          attributes: ['uuid', 'amount', 'payment_gateway', 'payment_type', 'status', 'paid_at'],
          required: false,
        },
      ],
    });

    if (!invoice) return null;

    const plain = invoice.get({ plain: true });
    return {
      ...plain,
      booking: {
        id: plain.booking?.id,
        uuid: plain.booking?.uuid,
        booking_reference: plain.booking?.booking_reference,
        guest_id: plain.booking?.guest_id,
        check_in_date: plain.booking?.check_in_date,
        check_out_date: plain.booking?.check_out_date,
        total_amount: plain.booking?.total_amount,
        status: plain.booking?.status,
        guest: plain.booking?.guest,
        wedding_group: plain.booking?.wedding_group
          ? {
              ...plain.booking.wedding_group,
              created_by: plain.booking.wedding_group.created_by,
              hotel: plain.booking.wedding_group.hotel || null,
            }
          : undefined,
      },
      payment: plain.payment || null,
    } as IInvoiceWithRelations;
  }

  /**
   * Get invoices with filtering and pagination
   */
  async findAllWithFilters(
    options: InvoiceQueryOptions,
  ): Promise<{ rows: IInvoiceWithRelations[]; count: number }> {
    const where: any = {};
    const bookingWhere: any = {};
    const weddingGroupWhere: any = {};

    // Apply data filtering by wedding group creator
    if (options.filterAdminId !== null && options.filterAdminId !== undefined) {
      weddingGroupWhere.created_by = options.filterAdminId;
    }

    // Apply filters
    if (options.status) {
      where.status = options.status;
    }
    if (options.invoice_type) {
      where.invoice_type = options.invoice_type;
    }
    if (options.currency) {
      where.currency = options.currency;
    }
    if (options.from_date) {
      where.created_at = { ...(where.created_at || {}), [Op.gte]: options.from_date };
    }
    if (options.to_date) {
      where.created_at = { ...(where.created_at || {}), [Op.lte]: options.to_date };
    }
    if (options.booking_id) {
      where.booking_id = options.booking_id;
    }
    if (options.search) {
      where[Op.or] = [
        { invoice_number: { [Op.iLike]: `%${options.search}%` } },
      ];
      bookingWhere[Op.or] = [
        { booking_reference: { [Op.iLike]: `%${options.search}%` } },
      ];
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;
    const sortBy = options.sort_by || 'created_at';
    const sortOrder = options.sort_order || 'DESC';

    // Determine if booking include should be required (for filtering)
    const hasBookingWhere = Object.keys(bookingWhere).length > 0;
    const hasWeddingGroupWhere = Object.keys(weddingGroupWhere).length > 0;

    const result = await this.invoiceModel.findAndCountAll({
      where,
      include: [
        {
          model: Bookings,
          as: 'booking',
          where: hasBookingWhere ? bookingWhere : undefined,
          required: hasBookingWhere || hasWeddingGroupWhere, // Required if filtering by booking or wedding group
          attributes: [
            'uuid',
            'booking_reference',
            'check_in_date',
            'check_out_date',
            'total_amount',
            'status',
          ],
          include: [
            {
              model: Guests,
              as: 'guest',
              attributes: ['uuid', 'name', 'email', 'phone'],
            },
            {
              model: WeddingGroups,
              as: 'wedding_group',
              where: hasWeddingGroupWhere ? weddingGroupWhere : undefined,
              required: hasWeddingGroupWhere, // Required if filtering by wedding group creator
              attributes: ['uuid', 'name', 'bride_name', 'groom_name', 'event_start_date', 'event_end_date', 'created_by'],
              include: [
                {
                  model: Hotels,
                  as: 'hotel',
                  attributes: ['uuid', 'name', 'city', 'country'],
                },
              ],
            },
          ],
        },
        {
          model: Payments,
          as: 'payment',
          attributes: ['uuid', 'amount', 'payment_gateway', 'payment_type', 'status', 'paid_at'],
          required: false,
        },
      ],
      order: [[sortBy, sortOrder]],
      offset,
      limit,
      distinct: true,
    });

    const rows = result.rows.map((inv) => {
      const plain = inv.get({ plain: true });
      return {
        ...plain,
        booking: {
          uuid: plain.booking?.uuid,
          booking_reference: plain.booking?.booking_reference,
          check_in_date: plain.booking?.check_in_date,
          check_out_date: plain.booking?.check_out_date,
          total_amount: plain.booking?.total_amount,
          status: plain.booking?.status,
          guest: plain.booking?.guest,
          wedding_group: plain.booking?.wedding_group
            ? {
                ...plain.booking.wedding_group,
                hotel: plain.booking.wedding_group.hotel || null,
              }
            : undefined,
        },
        payment: plain.payment || null,
      } as IInvoiceWithRelations;
    });

    return { rows, count: result.count };
  }

  /**
   * Generate next invoice number
   * Format: INV-YYYY-XXXXXX
   */
  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    // Get the highest invoice number for this year
    const lastInvoice = await this.invoiceModel.findOne({
      where: {
        invoice_number: { [Op.like]: `${prefix}%` },
      },
      order: [['invoice_number', 'DESC']],
      attributes: ['invoice_number'],
    });

    let nextNumber = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(
        lastInvoice.invoice_number.replace(prefix, ''),
        10,
      );
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
  }

  /**
   * Update invoice status
   */
  async updateStatus(uuid: string, status: InvoiceStatus): Promise<[number]> {
    const updateData: any = { status };
    if (status === 'issued') {
      updateData.issued_at = new Date();
    }
    const [affectedCount] = await this.invoiceModel.update(updateData, {
      where: { uuid },
    });
    return [affectedCount];
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(uuid: string, paymentId: number): Promise<[number]> {
    const [affectedCount] = await this.invoiceModel.update(
      {
        status: 'paid',
        payment_id: paymentId,
      } as any,
      { where: { uuid } },
    );
    return [affectedCount];
  }

  /**
   * Update PDF URL
   */
  async updatePdfUrl(uuid: string, pdfUrl: string): Promise<[number]> {
    const [affectedCount] = await this.invoiceModel.update(
      { pdf_url: pdfUrl } as any,
      { where: { uuid } },
    );
    return [affectedCount];
  }

  /**
   * Get invoice statistics
   */
  async getStats(weddingGroupId?: number): Promise<InvoiceStats> {
    const baseWhere: any = {};

    if (weddingGroupId) {
      // Need to filter by wedding group through booking
      const bookings = await Bookings.findAll({
        where: { wedding_group_id: weddingGroupId },
        attributes: ['id'],
      });
      const bookingIds = bookings.map((b) => b.id);
      baseWhere.booking_id = { [Op.in]: bookingIds };
    }

    const [
      totalInvoices,
      totalAmount,
      paidAmount,
      draftCount,
      issuedCount,
      paidCount,
      cancelledCount,
      depositCount,
      finalCount,
    ] = await Promise.all([
      this.invoiceModel.count({ where: baseWhere }),
      this.invoiceModel.sum('amount', { where: baseWhere }) || 0,
      this.invoiceModel.sum('amount', {
        where: { ...baseWhere, status: 'paid' },
      }) || 0,
      this.invoiceModel.count({ where: { ...baseWhere, status: 'draft' } }),
      this.invoiceModel.count({ where: { ...baseWhere, status: 'issued' } }),
      this.invoiceModel.count({ where: { ...baseWhere, status: 'paid' } }),
      this.invoiceModel.count({ where: { ...baseWhere, status: 'cancelled' } }),
      this.invoiceModel.count({ where: { ...baseWhere, invoice_type: 'deposit' } }),
      this.invoiceModel.count({ where: { ...baseWhere, invoice_type: 'final' } }),
    ]);

    const pendingAmount =
      (await this.invoiceModel.sum('amount', {
        where: { ...baseWhere, status: { [Op.in]: ['draft', 'issued'] } },
      })) || 0;

    return {
      total_invoices: totalInvoices,
      total_amount: Number(totalAmount),
      paid_amount: Number(paidAmount),
      pending_amount: Number(pendingAmount),
      by_status: {
        draft: draftCount,
        issued: issuedCount,
        paid: paidCount,
        cancelled: cancelledCount,
      },
      by_type: {
        deposit: depositCount,
        final: finalCount,
      },
    };
  }

  /**
   * Check if booking already has invoice of type
   */
  async hasInvoiceOfType(
    bookingId: number,
    invoiceType: InvoiceType,
  ): Promise<boolean> {
    const count = await this.invoiceModel.count({
      where: {
        booking_id: bookingId,
        invoice_type: invoiceType,
        status: { [Op.ne]: 'cancelled' },
      },
    });
    return count > 0;
  }
}
