/**
 * ============================================
 * SUPABASE GUESTS REPOSITORY IMPLEMENTATION
 * ============================================
 *
 * Implements IGuestsRepository using Supabase client.
 * This is prepared for future migration to Supabase.
 *
 * To use:
 * 1. Install: npm install @supabase/supabase-js
 * 2. Set env: DATABASE_PROVIDER=supabase
 * 3. Set env: SUPABASE_URL, SUPABASE_SERVICE_KEY
 * 4. Restart server
 *
 * All Supabase-specific code is contained here.
 * Services never see Supabase - they only use the interface.
 */

import { Injectable } from '@nestjs/common';
import {
  FindOptions,
  CountOptions,
  FindAndCountResult,
} from '../base.repository.interface';
import {
  IGuestsRepository,
  GuestEntity,
  CreateGuestData,
  UpdateGuestData,
  GuestQueryParams,
  GuestStats,
} from '../guests.repository.interface';

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
export class SupabaseGuestsRepository implements IGuestsRepository {
  private readonly tableName = 'guests';
  private readonly weddingGroupsTable = 'wedding_groups';

  // ============================================
  // BASE REPOSITORY METHODS
  // ============================================

  async create(data: CreateGuestData): Promise<GuestEntity> {
    const supabase = await getSupabaseClient();

    const { data: guest, error } = await supabase
      .from(this.tableName)
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase create error: ${error.message}`);
    }

    return guest as GuestEntity;
  }

  async findAll(options?: FindOptions): Promise<GuestEntity[]> {
    const supabase = await getSupabaseClient();

    let query = supabase.from(this.tableName).select(
      options?.attributes?.join(',') || '*',
    );

    if (options?.where) {
      query = this.applyWhereConditions(query, options.where);
    }

    if (options?.order) {
      for (const [column, direction] of options.order) {
        query = query.order(column, { ascending: direction === 'ASC' });
      }
    }

    if (options?.offset !== undefined && options?.limit !== undefined) {
      query = query.range(options.offset, options.offset + options.limit - 1);
    } else if (options?.limit !== undefined) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Supabase findAll error: ${error.message}`);
    }

    return (data || []) as GuestEntity[];
  }

  async findAndCountAll(
    options?: FindOptions,
  ): Promise<FindAndCountResult<GuestEntity>> {
    const supabase = await getSupabaseClient();

    // Get count first
    let countQuery = supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    if (options?.where) {
      countQuery = this.applyWhereConditions(countQuery, options.where);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      throw new Error(`Supabase count error: ${countError.message}`);
    }

    // Get data
    let dataQuery = supabase
      .from(this.tableName)
      .select(options?.attributes?.join(',') || '*');

    if (options?.where) {
      dataQuery = this.applyWhereConditions(dataQuery, options.where);
    }

    if (options?.order) {
      for (const [column, direction] of options.order) {
        dataQuery = dataQuery.order(column, { ascending: direction === 'ASC' });
      }
    }

    if (options?.offset !== undefined && options?.limit !== undefined) {
      dataQuery = dataQuery.range(
        options.offset,
        options.offset + options.limit - 1,
      );
    } else if (options?.limit !== undefined) {
      dataQuery = dataQuery.limit(options.limit);
    }

    const { data, error: dataError } = await dataQuery;

    if (dataError) {
      throw new Error(`Supabase findAndCountAll error: ${dataError.message}`);
    }

    return {
      rows: (data || []) as GuestEntity[],
      count: count || 0,
    };
  }

  async findOne(options: FindOptions): Promise<GuestEntity | null> {
    const supabase = await getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select(options?.attributes?.join(',') || '*');

    if (options?.where) {
      query = this.applyWhereConditions(query, options.where);
    }

    const { data, error } = await query.limit(1).single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findOne error: ${error.message}`);
    }

    return (data as GuestEntity) || null;
  }

  async findByUuid(
    uuid: string,
    options?: FindOptions,
  ): Promise<GuestEntity | null> {
    const supabase = await getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select(options?.attributes?.join(',') || '*')
      .eq('uuid', uuid);

    const { data, error } = await query.limit(1).single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findByUuid error: ${error.message}`);
    }

    return (data as GuestEntity) || null;
  }

  async update(uuid: string, data: UpdateGuestData): Promise<[number]> {
    const supabase = await getSupabaseClient();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('uuid', uuid)
      .select();

    if (error) {
      throw new Error(`Supabase update error: ${error.message}`);
    }

    return [result?.length || 0];
  }

  async delete(uuid: string): Promise<number> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('uuid', uuid)
      .select();

    if (error) {
      throw new Error(`Supabase delete error: ${error.message}`);
    }

    return data?.length || 0;
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

  // ============================================
  // GUEST-SPECIFIC METHODS
  // ============================================

  async findByEmailInGroup(
    email: string,
    weddingGroupId: number,
  ): Promise<GuestEntity | null> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('wedding_group_id', weddingGroupId)
      .ilike('email', email)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findByEmailInGroup error: ${error.message}`);
    }

    return (data as GuestEntity) || null;
  }

  async isEmailExistsInGroup(
    email: string,
    weddingGroupId: number,
    excludeGuestId?: number,
  ): Promise<boolean> {
    const supabase = await getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('wedding_group_id', weddingGroupId)
      .ilike('email', email);

    if (excludeGuestId) {
      query = query.neq('id', excludeGuestId);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Supabase isEmailExistsInGroup error: ${error.message}`);
    }

    return (count || 0) > 0;
  }

  async findAllWithFilters(
    query: GuestQueryParams,
    filterAdminId?: number | null,
  ): Promise<{ rows: GuestEntity[]; count: number }> {
    const supabase = await getSupabaseClient();

    const {
      page = 1,
      limit = 25,
      search,
      wedding_group_uuid,
      status,
      relationship,
      side,
      invitation_sent,
      sort_by = 'created_at',
      sort_order = 'DESC',
    } = query;

    const offset = (page - 1) * limit;

    // Get wedding group ID if uuid provided
    let weddingGroupId: number | null = null;
    if (wedding_group_uuid) {
      weddingGroupId = await this.getWeddingGroupIdByUuid(wedding_group_uuid);
    }

    // Build count query
    let countQuery = supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    // Build data query with relations
    let dataQuery = supabase.from(this.tableName).select(`
      *,
      wedding_group:wedding_groups (
        uuid,
        name,
        booking_link,
        event_start_date,
        event_end_date,
        created_by
      ),
      bookings (
        uuid,
        booking_reference,
        status,
        total_amount
      )
    `);

    // Data-level filtering: Filter by wedding group owner
    if (filterAdminId !== null && filterAdminId !== undefined) {
      // Get all wedding group IDs owned by this admin
      const { data: ownedGroups, error: groupsError } = await supabase
        .from(this.weddingGroupsTable)
        .select('id')
        .eq('created_by', filterAdminId);

      if (groupsError) {
        throw new Error(`Supabase ownedGroups error: ${groupsError.message}`);
      }

      const ownedGroupIds = (ownedGroups || []).map((g: any) => g.id);
      if (ownedGroupIds.length > 0) {
        countQuery = countQuery.in('wedding_group_id', ownedGroupIds);
        dataQuery = dataQuery.in('wedding_group_id', ownedGroupIds);
      } else {
        // No owned groups, return empty result
        return { rows: [], count: 0 };
      }
    }

    // Apply filters
    if (weddingGroupId) {
      countQuery = countQuery.eq('wedding_group_id', weddingGroupId);
      dataQuery = dataQuery.eq('wedding_group_id', weddingGroupId);
    }

    if (search) {
      const searchPattern = `%${search}%`;
      countQuery = countQuery.or(`name.ilike.${searchPattern},email.ilike.${searchPattern}`);
      dataQuery = dataQuery.or(`name.ilike.${searchPattern},email.ilike.${searchPattern}`);
    }

    if (status) {
      countQuery = countQuery.eq('status', status);
      dataQuery = dataQuery.eq('status', status);
    }

    if (relationship) {
      countQuery = countQuery.eq('relationship', relationship);
      dataQuery = dataQuery.eq('relationship', relationship);
    }

    if (side) {
      countQuery = countQuery.eq('side', side);
      dataQuery = dataQuery.eq('side', side);
    }

    if (typeof invitation_sent === 'boolean') {
      countQuery = countQuery.eq('invitation_sent', invitation_sent);
      dataQuery = dataQuery.eq('invitation_sent', invitation_sent);
    }

    // Apply ordering and pagination
    dataQuery = dataQuery
      .order(sort_by, { ascending: sort_order === 'ASC' })
      .range(offset, offset + limit - 1);

    // Execute queries
    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

    if (countResult.error) {
      throw new Error(`Supabase count error: ${countResult.error.message}`);
    }

    if (dataResult.error) {
      throw new Error(`Supabase data error: ${dataResult.error.message}`);
    }

    return {
      rows: (dataResult.data || []) as GuestEntity[],
      count: countResult.count || 0,
    };
  }

  async findByUuidWithWeddingGroup(uuid: string): Promise<GuestEntity | null> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        wedding_group:wedding_groups (id)
      `)
      .eq('uuid', uuid)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findByUuidWithWeddingGroup error: ${error.message}`);
    }

    return (data as GuestEntity) || null;
  }

  async findByUuidWithDetails(uuid: string): Promise<GuestEntity | null> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        wedding_group:wedding_groups (
          uuid,
          name,
          booking_link,
          event_start_date,
          event_end_date,
          status
        ),
        bookings (
          uuid,
          booking_reference,
          check_in_date,
          check_out_date,
          total_rooms,
          total_adults,
          total_children,
          total_amount,
          currency,
          status,
          created_at
        )
      `)
      .eq('uuid', uuid)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findByUuidWithDetails error: ${error.message}`);
    }

    return (data as GuestEntity) || null;
  }

  async findByUuidForInvitation(uuid: string): Promise<GuestEntity | null> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        wedding_group:wedding_groups (
          uuid,
          name,
          booking_link,
          event_start_date,
          event_end_date,
          status,
          welcome_message,
          bride_name,
          groom_name,
          hotel_id,
          hotel:hotels (
            name,
            city,
            country
          )
        )
      `)
      .eq('uuid', uuid)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findByUuidForInvitation error: ${error.message}`);
    }

    return (data as GuestEntity) || null;
  }

  async getWeddingGroupIdByUuid(uuid: string): Promise<number | null> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from(this.weddingGroupsTable)
      .select('id')
      .eq('uuid', uuid)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase getWeddingGroupIdByUuid error: ${error.message}`);
    }

    return data ? data.id : null;
  }

  async getWeddingGroupByUuid(uuid: string): Promise<{ id: number; created_by: number | null } | null> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from(this.weddingGroupsTable)
      .select('id, created_by')
      .eq('uuid', uuid)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase getWeddingGroupByUuid error: ${error.message}`);
    }

    return data ? { id: data.id, created_by: data.created_by } : null;
  }

  async getStatsByWeddingGroup(weddingGroupId: number): Promise<GuestStats> {
    const supabase = await getSupabaseClient();

    // Get total count
    const { count: totalGuests, error: totalError } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('wedding_group_id', weddingGroupId);

    if (totalError) {
      throw new Error(`Supabase getStatsByWeddingGroup total error: ${totalError.message}`);
    }

    // Get invited count
    const { count: invitedCount, error: invitedError } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('wedding_group_id', weddingGroupId)
      .eq('invitation_sent', true);

    if (invitedError) {
      throw new Error(`Supabase getStatsByWeddingGroup invited error: ${invitedError.message}`);
    }

    // Get counts by status
    const statusCounts = { pending: 0, invited: 0, booked: 0, declined: 0 };

    for (const status of ['pending', 'invited', 'booked', 'declined']) {
      const { count, error } = await supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('wedding_group_id', weddingGroupId)
        .eq('status', status);

      if (error) {
        throw new Error(`Supabase getStatsByWeddingGroup status error: ${error.message}`);
      }

      statusCounts[status as keyof typeof statusCounts] = count || 0;
    }

    const total = totalGuests || 0;
    const invited = invitedCount || 0;

    return {
      total,
      invited,
      by_status: statusCounts,
      response_rate:
        invited > 0
          ? Math.round(((statusCounts.booked + statusCounts.declined) / invited) * 100)
          : 0,
      booking_rate:
        invited > 0
          ? Math.round((statusCounts.booked / invited) * 100)
          : 0,
    };
  }

  async updateInstance(guest: GuestEntity, data: UpdateGuestData): Promise<GuestEntity> {
    const supabase = await getSupabaseClient();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('uuid', guest.uuid)
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase updateInstance error: ${error.message}`);
    }

    return result as GuestEntity;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Apply generic where conditions to Supabase query
   */
  private applyWhereConditions(query: any, where: Record<string, any>): any {
    for (const [key, value] of Object.entries(where)) {
      if (key === '$or') {
        const orConditions = value
          .map((condition: Record<string, any>) => {
            const parts: string[] = [];
            for (const [k, v] of Object.entries(condition)) {
              if (typeof v === 'object' && v !== null && '$iLike' in v) {
                parts.push(`${k}.ilike.${v.$iLike}`);
              } else if (typeof v === 'object' && v !== null && '$like' in v) {
                parts.push(`${k}.ilike.${v.$like}`);
              } else {
                parts.push(`${k}.eq.${v}`);
              }
            }
            return parts.join(',');
          })
          .join(',');
        query = query.or(orConditions);
      } else if (typeof value === 'object' && value !== null) {
        if ('$iLike' in value) {
          query = query.ilike(key, value.$iLike);
        } else if ('$like' in value) {
          query = query.ilike(key, value.$like);
        } else if ('$ne' in value) {
          query = query.neq(key, value.$ne);
        } else if ('$eq' in value) {
          query = query.eq(key, value.$eq);
        } else if ('$gt' in value) {
          query = query.gt(key, value.$gt);
        } else if ('$gte' in value) {
          query = query.gte(key, value.$gte);
        } else if ('$lt' in value) {
          query = query.lt(key, value.$lt);
        } else if ('$lte' in value) {
          query = query.lte(key, value.$lte);
        } else if ('$in' in value) {
          query = query.in(key, value.$in);
        }
      } else {
        query = query.eq(key, value);
      }
    }
    return query;
  }
}
