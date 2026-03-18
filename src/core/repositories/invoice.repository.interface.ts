/**
 * ============================================
 * INVOICE REPOSITORY INTERFACE
 * ============================================
 *
 * Repository interface for Invoice entity.
 * Supports both Sequelize and Supabase implementations.
 *
 * Used for:
 * - Generating invoices for bookings
 * - Tracking payment invoices (deposit, final)
 * - PDF generation and email sending
 */

import { IBaseRepository, FindOptions } from './base.repository.interface';

// Invoice Types
export type InvoiceType = 'deposit' | 'final';
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled';

// Invoice Entity Interface
export interface IInvoice {
  id: number;
  uuid: string;
  booking_id: number;
  payment_id: number | null;
  invoice_number: string;
  invoice_type: InvoiceType;
  subtotal: number;
  tax_amount: number;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  due_date: string | null;
  issued_at: Date | null;
  pdf_url: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date | null;
  // Relations
  booking?: any;
  payment?: any;
}

// Create Invoice DTO Interface
export interface ICreateInvoice {
  booking_id: number;
  payment_id?: number | null;
  invoice_number: string;
  invoice_type: InvoiceType;
  subtotal: number;
  tax_amount?: number;
  amount: number;
  currency?: string;
  status?: InvoiceStatus;
  due_date?: string | null;
  issued_at?: Date | null;
  pdf_url?: string | null;
  notes?: string | null;
}

// Update Invoice DTO Interface
export interface IUpdateInvoice {
  payment_id?: number | null;
  status?: InvoiceStatus;
  due_date?: string | null;
  issued_at?: Date | null;
  pdf_url?: string | null;
  notes?: string | null;
}

// Invoice with relations for detailed view
export interface IInvoiceWithRelations extends IInvoice {
  booking: {
    uuid: string;
    booking_reference: string;
    check_in_date: string;
    check_out_date: string;
    total_amount: number;
    status: string;
    guest?: {
      uuid: string;
      name: string;
      email: string;
      phone: string | null;
    };
    wedding_group?: {
      uuid: string;
      name: string;
      bride_name: string;
      groom_name: string;
      event_start_date: string;
      event_end_date: string;
      created_by?: number; // For data-level ownership filtering
      hotel?: {
        uuid: string;
        name: string;
        city: string;
        country: string;
      };
    };
  };
  payment?: {
    uuid: string;
    amount: number;
    payment_method: string;
    status: string;
    paid_at: Date | null;
  } | null;
}

// Invoice Query Options
export interface InvoiceQueryOptions {
  booking_uuid?: string;
  booking_id?: number;
  status?: InvoiceStatus;
  invoice_type?: InvoiceType;
  currency?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
  filterAdminId?: number | null; // For data-level filtering (null = no filter, number = filter by wedding_group.created_by)
}

// Invoice Statistics
export interface InvoiceStats {
  total_invoices: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  by_status: {
    draft: number;
    issued: number;
    paid: number;
    cancelled: number;
  };
  by_type: {
    deposit: number;
    final: number;
  };
}

/**
 * Invoice Repository Interface
 * Extends base repository with invoice-specific methods
 */
export interface IInvoiceRepository
  extends IBaseRepository<IInvoice, ICreateInvoice, IUpdateInvoice> {
  /**
   * Find invoice by invoice number
   */
  findByInvoiceNumber(invoiceNumber: string): Promise<IInvoice | null>;

  /**
   * Find invoices by booking ID
   */
  findByBookingId(bookingId: number): Promise<IInvoice[]>;

  /**
   * Find invoices by booking UUID
   */
  findByBookingUuid(bookingUuid: string): Promise<IInvoice[]>;

  /**
   * Find invoice with full relations
   */
  findByUuidWithRelations(uuid: string): Promise<IInvoiceWithRelations | null>;

  /**
   * Get invoices with filtering and pagination
   */
  findAllWithFilters(
    options: InvoiceQueryOptions,
  ): Promise<{ rows: IInvoiceWithRelations[]; count: number }>;

  /**
   * Generate next invoice number
   * Format: INV-YYYY-XXXXXX (e.g., INV-2026-000001)
   */
  generateInvoiceNumber(): Promise<string>;

  /**
   * Update invoice status
   */
  updateStatus(uuid: string, status: InvoiceStatus): Promise<[number]>;

  /**
   * Mark invoice as paid and link to payment
   */
  markAsPaid(uuid: string, paymentId: number): Promise<[number]>;

  /**
   * Update PDF URL after generation
   */
  updatePdfUrl(uuid: string, pdfUrl: string): Promise<[number]>;

  /**
   * Get invoice statistics
   */
  getStats(weddingGroupId?: number): Promise<InvoiceStats>;

  /**
   * Check if booking already has invoice of type
   */
  hasInvoiceOfType(bookingId: number, invoiceType: InvoiceType): Promise<boolean>;
}

// Repository injection token
export const INVOICE_REPOSITORY = 'INVOICE_REPOSITORY';
