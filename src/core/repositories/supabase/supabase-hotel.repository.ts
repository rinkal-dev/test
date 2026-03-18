/**
 * ============================================
 * SUPABASE HOTEL REPOSITORY IMPLEMENTATION
 * ============================================
 *
 * Implements IHotelRepository using Supabase client.
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
  IHotelRepository,
  HotelEntity,
  CreateHotelData,
  UpdateHotelData,
  HotelQueryParams,
} from '../hotel.repository.interface';

// Supabase client will be dynamically imported when needed
let supabaseClient: any = null;
let supabaseModule: any = null;

const getSupabaseClient = async () => {
  if (supabaseClient) return supabaseClient;

  try {
    // Dynamic import to avoid build errors when package is not installed
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
export class SupabaseHotelRepository implements IHotelRepository {
  private readonly tableName = 'hotels';

  async create(data: CreateHotelData): Promise<HotelEntity> {
    const supabase = await getSupabaseClient();

    const { data: hotel, error } = await supabase
      .from(this.tableName)
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase create error: ${error.message}`);
    }

    return hotel as HotelEntity;
  }

  async findAll(options?: FindOptions): Promise<HotelEntity[]> {
    const supabase = await getSupabaseClient();

    let query = supabase.from(this.tableName).select(
      options?.attributes?.join(',') || '*',
    );

    // Apply where conditions
    if (options?.where) {
      query = this.applyWhereConditions(query, options.where);
    }

    // Apply ordering
    if (options?.order) {
      for (const [column, direction] of options.order) {
        query = query.order(column, { ascending: direction === 'ASC' });
      }
    }

    // Apply pagination
    if (options?.offset !== undefined && options?.limit !== undefined) {
      query = query.range(options.offset, options.offset + options.limit - 1);
    } else if (options?.limit !== undefined) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Supabase findAll error: ${error.message}`);
    }

    return (data || []) as HotelEntity[];
  }

  async findAndCountAll(
    options?: FindOptions,
  ): Promise<FindAndCountResult<HotelEntity>> {
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
      rows: (data || []) as HotelEntity[],
      count: count || 0,
    };
  }

  async findOne(options: FindOptions): Promise<HotelEntity | null> {
    const supabase = await getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select(options?.attributes?.join(',') || '*');

    if (options?.where) {
      query = this.applyWhereConditions(query, options.where);
    }

    const { data, error } = await query.limit(1).single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw new Error(`Supabase findOne error: ${error.message}`);
    }

    return (data as HotelEntity) || null;
  }

  async findByUuid(
    uuid: string,
    options?: FindOptions,
  ): Promise<HotelEntity | null> {
    const supabase = await getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select(options?.attributes?.join(',') || '*')
      .eq('uuid', uuid);

    const { data, error } = await query.limit(1).single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findByUuid error: ${error.message}`);
    }

    return (data as HotelEntity) || null;
  }

  async update(uuid: string, data: UpdateHotelData): Promise<[number]> {
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
  // HOTEL-SPECIFIC METHODS
  // ============================================

  async findBySlug(slug: string): Promise<HotelEntity | null> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('slug', slug)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findBySlug error: ${error.message}`);
    }

    return (data as HotelEntity) || null;
  }

  async isSlugExists(slug: string, excludeUuid?: string): Promise<boolean> {
    const supabase = await getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('slug', slug);

    if (excludeUuid) {
      query = query.neq('uuid', excludeUuid);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Supabase isSlugExists error: ${error.message}`);
    }

    return (count || 0) > 0;
  }

  async findAllWithFilters(
    query: HotelQueryParams,
  ): Promise<{ rows: HotelEntity[]; count: number }> {
    const supabase = await getSupabaseClient();

    const {
      page = 1,
      limit = 10,
      search,
      country,
      city,
      star_rating,
      is_active,
      sort_by = 'created_at',
      sort_order = 'DESC',
    } = query;

    const offset = (page - 1) * limit;

    // Build count query
    let countQuery = supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    // Build data query
    let dataQuery = supabase.from(this.tableName).select(`
      id,
      uuid,
      name,
      slug,
      description,
      address,
      city,
      state,
      country,
      postal_code,
      phone,
      email,
      website,
      star_rating,
      check_in_time,
      check_out_time,
      latitude,
      longitude,
      image_url,
      amenities,
      gallery_images,
      is_active,
      created_at,
      updated_at
    `);

    // Apply search filter
    if (search) {
      const searchPattern = `%${search}%`;
      countQuery = countQuery.or(
        `name.ilike.${searchPattern},address.ilike.${searchPattern},city.ilike.${searchPattern},country.ilike.${searchPattern}`,
      );
      dataQuery = dataQuery.or(
        `name.ilike.${searchPattern},address.ilike.${searchPattern},city.ilike.${searchPattern},country.ilike.${searchPattern}`,
      );
    }

    // Apply country filter
    if (country) {
      countQuery = countQuery.ilike('country', `%${country}%`);
      dataQuery = dataQuery.ilike('country', `%${country}%`);
    }

    // Apply city filter
    if (city) {
      countQuery = countQuery.ilike('city', `%${city}%`);
      dataQuery = dataQuery.ilike('city', `%${city}%`);
    }

    // Apply star rating filter
    if (star_rating) {
      countQuery = countQuery.eq('star_rating', star_rating);
      dataQuery = dataQuery.eq('star_rating', star_rating);
    }

    // Apply active status filter
    if (is_active !== undefined) {
      countQuery = countQuery.eq('is_active', is_active);
      dataQuery = dataQuery.eq('is_active', is_active);
    }

    // Apply ordering and pagination
    dataQuery = dataQuery
      .order(sort_by, { ascending: sort_order === 'ASC' })
      .range(offset, offset + limit - 1);

    // Execute queries
    const [countResult, dataResult] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    if (countResult.error) {
      throw new Error(
        `Supabase findAllWithFilters count error: ${countResult.error.message}`,
      );
    }

    if (dataResult.error) {
      throw new Error(
        `Supabase findAllWithFilters data error: ${dataResult.error.message}`,
      );
    }

    return {
      rows: (dataResult.data || []) as HotelEntity[],
      count: countResult.count || 0,
    };
  }

  async search(searchQuery: string, limit: number = 10): Promise<HotelEntity[]> {
    const supabase = await getSupabaseClient();

    const searchPattern = `%${searchQuery}%`;

    const { data, error } = await supabase
      .from(this.tableName)
      .select('uuid, name, slug, city, country, star_rating, image_url')
      .eq('is_active', true)
      .or(
        `name.ilike.${searchPattern},city.ilike.${searchPattern},country.ilike.${searchPattern}`,
      )
      .limit(limit);

    if (error) {
      throw new Error(`Supabase search error: ${error.message}`);
    }

    return (data || []) as HotelEntity[];
  }

  async changeStatus(uuid: string, is_active: boolean): Promise<[number]> {
    return await this.update(uuid, { is_active });
  }

  async findByUuidWithRoomTypes(uuid: string): Promise<HotelEntity | null> {
    const supabase = await getSupabaseClient();

    // Note: Supabase requires the relation to be defined in the database
    // This assumes room_types has a foreign key to hotels
    const { data, error } = await supabase
      .from(this.tableName)
      .select(
        `
        *,
        room_types (
          uuid,
          name,
          slug,
          description,
          bed_type,
          room_size,
          max_adults,
          max_children,
          max_occupancy,
          base_price,
          amenities,
          image_url,
          sort_order,
          is_active,
          created_at
        )
      `,
      )
      .eq('uuid', uuid)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(
        `Supabase findByUuidWithRoomTypes error: ${error.message}`,
      );
    }

    return (data as HotelEntity) || null;
  }

  async findBySlugWithRoomTypes(slug: string): Promise<HotelEntity | null> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(
        `
        *,
        room_types (
          uuid,
          name,
          slug,
          description,
          bed_type,
          room_size,
          max_adults,
          max_children,
          max_occupancy,
          base_price,
          amenities,
          image_url,
          sort_order,
          is_active
        )
      `,
      )
      .eq('slug', slug)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(
        `Supabase findBySlugWithRoomTypes error: ${error.message}`,
      );
    }

    return (data as HotelEntity) || null;
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
        // Handle OR conditions
        const orConditions = value
          .map((condition: Record<string, any>) => {
            const parts: string[] = [];
            for (const [k, v] of Object.entries(condition)) {
              if (typeof v === 'object' && v !== null && '$like' in v) {
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
        if ('$like' in value) {
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
