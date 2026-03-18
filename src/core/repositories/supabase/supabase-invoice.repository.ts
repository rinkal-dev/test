/**
 * ============================================
 * SUPABASE INVOICE REPOSITORY IMPLEMENTATION
 * ============================================
 *
 * Implements IInvoiceRepository using Supabase client.
 * This is prepared for future migration to Supabase.
 *
 * To use:
 * 1. Install: npm install @supabase/supabase-js
 * 2. Set env: DATABASE_PROVIDER=supabase
 * 3. Set env: SUPABASE_URL, SUPABASE_SERVICE_KEY
 * 4. Restart server
 */

import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  FindOptions,
  CountOptions,
  FindAndCountResult,
} from '../base.repository.interface';
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

// Supabase client will be dynamically imported when needed
let supabaseClient: any = null;
let supabaseModule: any = null;

const getSupabaseClient = async () => {
  if (supabaseClient) return supabaseClient;

  try {
    if (!supabaseModule) {
      try {
        supabaseModule = await eval(`import('@supabase/supabase-js')`);
      } catch (importError) {
        throw new Error(
          'Supabase package not installed. Run: npm install @supabase/supabase-js',
        );
      }
    }

    const { createClient } = supabaseModule;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_KEY/SUPABASE_ANON_KEY are required',
      );
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);
    return supabaseClient;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    throw error;
  }
};

@Injectable()
export class SupabaseInvoiceRepository implements IInvoiceRepository {
  private readonly tableName = 'invoices';

  private applyWhereConditions(query: any, where: Record<string, any>): any {
    for (const [key, value] of Object.entries(where)) {
      if (value === null) {
        query = query.is(key, null);
      } else if (typeof value === 'object' && value !== null) {
        // Handle operators like { gte: value }, { lte: value }, etc.
        for (const [op, opValue] of Object.entries(value)) {
          switch (op) {
            case 'gte':
              query = query.gte(key, opValue);
              break;
            case 'lte':
              query = query.lte(key, opValue);
              break;
            case 'gt':
              query = query.gt(key, opValue);
              break;
            case 'lt':
              query = query.lt(key, opValue);
              break;
            case 'like':
            case 'iLike':
              query = query.ilike(key, opValue);
              break;
            case 'in':
              query = query.in(key, opValue);
              break;
            case 'ne':
              query = query.neq(key, opValue);
              break;
          }
        }
      } else {
        query = query.eq(key, value);
      }
    }
    return query;
  }

  async create(data: ICreateInvoice): Promise<IInvoice> {
    const supabase = await getSupabaseClient();

    const { data: invoice, error } = await supabase
      .from(this.tableName)
      .insert({
        uuid: uuidv4(),
        ...data,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase create error: ${error.message}`);
    }

    return invoice as IInvoice;
  }

  async findAll(options?: FindOptions): Promise<IInvoice[]> {
    const supabase = await getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select(options?.attributes?.join(',') || '*');

    if (options?.where) {
      query = this.applyWhereConditions(query, options.where);
    }

    if (options?.order) {
      for (const [column, direction] of options.order) {
        query = query.order(column, { ascending: direction === 'ASC' });
      }
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 100) - 1,
      );
    } else if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data: invoices, error } = await query;

    if (error) {
      throw new Error(`Supabase findAll error: ${error.message}`);
    }

    return invoices as IInvoice[];
  }

  async findAndCountAll(
    options?: FindOptions,
  ): Promise<FindAndCountResult<IInvoice>> {
    const supabase = await getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select(options?.attributes?.join(',') || '*', { count: 'exact' });

    if (options?.where) {
      query = this.applyWhereConditions(query, options.where);
    }

    if (options?.order) {
      for (const [column, direction] of options.order) {
        query = query.order(column, { ascending: direction === 'ASC' });
      }
    }

    if (options?.offset !== undefined && options?.limit) {
      query = query.range(options.offset, options.offset + options.limit - 1);
    } else if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data: invoices, count, error } = await query;

    if (error) {
      throw new Error(`Supabase findAndCountAll error: ${error.message}`);
    }

    return {
      rows: invoices as IInvoice[],
      count: count || 0,
    };
  }

  async findOne(options: FindOptions): Promise<IInvoice | null> {
    const supabase = await getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select(options.attributes?.join(',') || '*');

    if (options.where) {
      query = this.applyWhereConditions(query, options.where);
    }

    query = query.limit(1).single();

    const { data: invoice, error } = await query;

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findOne error: ${error.message}`);
    }

    return invoice as IInvoice | null;
  }

  async findByUuid(uuid: string, options?: FindOptions): Promise<IInvoice | null> {
    const supabase = await getSupabaseClient();

    const { data: invoice, error } = await supabase
      .from(this.tableName)
      .select(options?.attributes?.join(',') || '*')
      .eq('uuid', uuid)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findByUuid error: ${error.message}`);
    }

    return invoice as IInvoice | null;
  }

  async update(uuid: string, data: IUpdateInvoice): Promise<[number]> {
    const supabase = await getSupabaseClient();

    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('uuid', uuid)
      .select();

    if (error) {
      throw new Error(`Supabase update error: ${error.message}`);
    }

    return [updated?.length || 0];
  }

  async delete(uuid: string): Promise<number> {
    const supabase = await getSupabaseClient();

    const { data: deleted, error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('uuid', uuid)
      .select();

    if (error) {
      throw new Error(`Supabase delete error: ${error.message}`);
    }

    return deleted?.length || 0;
  }

  async count(options?: CountOptions): Promise<number> {
    const supabase = await getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    if (options?.where) {
      query = this.applyWhereConditions(query, options.where);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Supabase count error: ${error.message}`);
    }

    return count || 0;
  }

  async exists(uuid: string): Promise<boolean> {
    const count = await this.count({ where: { uuid } });
    return count > 0;
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<IInvoice | null> {
    const supabase = await getSupabaseClient();

    const { data: invoice, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('invoice_number', invoiceNumber)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findByInvoiceNumber error: ${error.message}`);
    }

    return invoice as IInvoice | null;
  }

  async findByBookingId(bookingId: number): Promise<IInvoice[]> {
    const supabase = await getSupabaseClient();

    const { data: invoices, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Supabase findByBookingId error: ${error.message}`);
    }

    return invoices as IInvoice[];
  }

  async findByBookingUuid(bookingUuid: string): Promise<IInvoice[]> {
    const supabase = await getSupabaseClient();

    // First get booking ID
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id')
      .eq('uuid', bookingUuid)
      .single();

    if (bookingError || !booking) {
      return [];
    }

    return this.findByBookingId(booking.id);
  }

  async findByUuidWithRelations(uuid: string): Promise<IInvoiceWithRelations | null> {
    const supabase = await getSupabaseClient();

    const { data: invoice, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        booking:bookings(
          uuid,
          booking_reference,
          check_in_date,
          check_out_date,
          total_amount,
          status,
          guest:guests(uuid, name, email, phone),
          weddingGroup:wedding_groups(uuid, name, bride_name, groom_name, created_by)
        ),
        payment:payments(uuid, amount, payment_method, status, paid_at)
      `)
      .eq('uuid', uuid)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findByUuidWithRelations error: ${error.message}`);
    }

    if (!invoice) return null;

    return {
      ...invoice,
      booking: {
        ...invoice.booking,
        wedding_group: invoice.booking?.weddingGroup
          ? {
              ...invoice.booking.weddingGroup,
              created_by: invoice.booking.weddingGroup.created_by,
            }
          : undefined,
      },
    } as IInvoiceWithRelations;
  }

  async findAllWithFilters(
    options: InvoiceQueryOptions,
  ): Promise<{ rows: IInvoiceWithRelations[]; count: number }> {
    const supabase = await getSupabaseClient();

    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    // If filtering by admin, first get accessible wedding groups
    let accessibleGroupIds: number[] | null = null;
    if (options.filterAdminId !== null && options.filterAdminId !== undefined) {
      const { data: groups } = await supabase
        .from('wedding_groups')
        .select('id')
        .eq('created_by', options.filterAdminId);

      accessibleGroupIds = (groups || []).map((g: any) => g.id);

      // If no accessible groups, return empty result
      if (accessibleGroupIds.length === 0) {
        return { rows: [], count: 0 };
      }
    }

    // Get booking IDs for accessible groups if filtering
    let accessibleBookingIds: number[] | null = null;
    if (accessibleGroupIds !== null) {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id')
        .in('wedding_group_id', accessibleGroupIds);

      accessibleBookingIds = (bookings || []).map((b: any) => b.id);

      if (accessibleBookingIds.length === 0) {
        return { rows: [], count: 0 };
      }
    }

    let query = supabase
      .from(this.tableName)
      .select(
        `
        *,
        booking:bookings(
          uuid,
          booking_reference,
          check_in_date,
          check_out_date,
          total_amount,
          status,
          guest:guests(uuid, name, email, phone),
          weddingGroup:wedding_groups(uuid, name, bride_name, groom_name, created_by)
        ),
        payment:payments(uuid, amount, payment_method, status, paid_at)
      `,
        { count: 'exact' },
      );

    // Apply data filtering
    if (accessibleBookingIds !== null) {
      query = query.in('booking_id', accessibleBookingIds);
    }

    // Apply filters
    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.invoice_type) {
      query = query.eq('invoice_type', options.invoice_type);
    }
    if (options.currency) {
      query = query.eq('currency', options.currency);
    }
    if (options.booking_id) {
      query = query.eq('booking_id', options.booking_id);
    }
    if (options.from_date) {
      query = query.gte('created_at', options.from_date);
    }
    if (options.to_date) {
      query = query.lte('created_at', options.to_date);
    }
    if (options.search) {
      query = query.ilike('invoice_number', `%${options.search}%`);
    }

    // Apply sorting
    const sortBy = options.sort_by || 'created_at';
    const sortOrder = options.sort_order || 'DESC';
    query = query.order(sortBy, { ascending: sortOrder === 'ASC' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: invoices, count, error } = await query;

    if (error) {
      throw new Error(`Supabase findAllWithFilters error: ${error.message}`);
    }

    const rows = (invoices || []).map((inv: any) => ({
      ...inv,
      booking: {
        ...inv.booking,
        wedding_group: inv.booking?.weddingGroup
          ? {
              ...inv.booking.weddingGroup,
              created_by: inv.booking.weddingGroup.created_by,
            }
          : undefined,
      },
    })) as IInvoiceWithRelations[];

    return { rows, count: count || 0 };
  }

  async generateInvoiceNumber(): Promise<string> {
    const supabase = await getSupabaseClient();

    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const { data: lastInvoice, error } = await supabase
      .from(this.tableName)
      .select('invoice_number')
      .like('invoice_number', `${prefix}%`)
      .order('invoice_number', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase generateInvoiceNumber error: ${error.message}`);
    }

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

  async updateStatus(uuid: string, status: InvoiceStatus): Promise<[number]> {
    const updateData: any = { status, updated_at: new Date().toISOString() };
    if (status === 'issued') {
      updateData.issued_at = new Date().toISOString();
    }
    return this.update(uuid, updateData);
  }

  async markAsPaid(uuid: string, paymentId: number): Promise<[number]> {
    return this.update(uuid, {
      status: 'paid',
      payment_id: paymentId,
    } as any);
  }

  async updatePdfUrl(uuid: string, pdfUrl: string): Promise<[number]> {
    return this.update(uuid, { pdf_url: pdfUrl } as any);
  }

  async getStats(weddingGroupId?: number): Promise<InvoiceStats> {
    const supabase = await getSupabaseClient();

    let bookingIds: number[] | null = null;

    if (weddingGroupId) {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('wedding_group_id', weddingGroupId);

      bookingIds = bookings?.map((b: any) => b.id) || [];
    }

    // Build base query
    let baseQuery = supabase.from(this.tableName).select('*', { count: 'exact' });
    if (bookingIds && bookingIds.length > 0) {
      baseQuery = baseQuery.in('booking_id', bookingIds);
    }

    const { data: invoices, count } = await baseQuery;

    const allInvoices = invoices || [];
    const totalAmount = allInvoices.reduce((sum: number, inv: any) => sum + Number(inv.amount || 0), 0);
    const paidInvoices = allInvoices.filter((inv: any) => inv.status === 'paid');
    const paidAmount = paidInvoices.reduce((sum: number, inv: any) => sum + Number(inv.amount || 0), 0);
    const pendingInvoices = allInvoices.filter((inv: any) => ['draft', 'issued'].includes(inv.status));
    const pendingAmount = pendingInvoices.reduce((sum: number, inv: any) => sum + Number(inv.amount || 0), 0);

    return {
      total_invoices: count || 0,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      pending_amount: pendingAmount,
      by_status: {
        draft: allInvoices.filter((inv: any) => inv.status === 'draft').length,
        issued: allInvoices.filter((inv: any) => inv.status === 'issued').length,
        paid: paidInvoices.length,
        cancelled: allInvoices.filter((inv: any) => inv.status === 'cancelled').length,
      },
      by_type: {
        deposit: allInvoices.filter((inv: any) => inv.invoice_type === 'deposit').length,
        final: allInvoices.filter((inv: any) => inv.invoice_type === 'final').length,
      },
    };
  }

  async hasInvoiceOfType(bookingId: number, invoiceType: InvoiceType): Promise<boolean> {
    const supabase = await getSupabaseClient();

    const { count, error } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('booking_id', bookingId)
      .eq('invoice_type', invoiceType)
      .neq('status', 'cancelled');

    if (error) {
      throw new Error(`Supabase hasInvoiceOfType error: ${error.message}`);
    }

    return (count || 0) > 0;
  }
}
