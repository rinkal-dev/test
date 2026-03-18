/**
 * ============================================
 * SUPABASE USER REPOSITORY IMPLEMENTATION
 * ============================================
 */

import { Injectable } from '@nestjs/common';
import {
  FindOptions,
  CountOptions,
  FindAndCountResult,
} from '../base.repository.interface';
import {
  IUserRepository,
  UserEntity,
  CreateUserData,
  UpdateUserData,
  UserQueryParams,
} from '../user.repository.interface';

let supabaseClient: any = null;
let supabaseModule: any = null;

const getSupabaseClient = async () => {
  if (supabaseClient) return supabaseClient;
  try {
    if (!supabaseModule) {
      supabaseModule = await eval(`import('@supabase/supabase-js')`);
    }
    const { createClient } = supabaseModule;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required');
    }
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    return supabaseClient;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    throw error;
  }
};

@Injectable()
export class SupabaseUserRepository implements IUserRepository {
  private readonly tableName = 'users';

  async create(data: CreateUserData): Promise<UserEntity> {
    const supabase = await getSupabaseClient();
    const { data: user, error } = await supabase
      .from(this.tableName)
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(`Supabase create error: ${error.message}`);
    return user as UserEntity;
  }

  async findAll(options?: FindOptions): Promise<UserEntity[]> {
    const supabase = await getSupabaseClient();
    let query = supabase.from(this.tableName).select(options?.attributes?.join(',') || '*');
    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    const { data, error } = await query;
    if (error) throw new Error(`Supabase findAll error: ${error.message}`);
    return (data || []) as UserEntity[];
  }

  async findAndCountAll(options?: FindOptions): Promise<FindAndCountResult<UserEntity>> {
    const supabase = await getSupabaseClient();
    const { count } = await supabase.from(this.tableName).select('*', { count: 'exact', head: true });
    let query = supabase.from(this.tableName).select(options?.attributes?.join(',') || '*');
    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    const { data, error } = await query;
    if (error) throw new Error(`Supabase findAndCountAll error: ${error.message}`);
    return { rows: (data || []) as UserEntity[], count: count || 0 };
  }

  async findOne(options: FindOptions): Promise<UserEntity | null> {
    const supabase = await getSupabaseClient();
    let query = supabase.from(this.tableName).select(options?.attributes?.join(',') || '*');
    if (options?.where) {
      for (const [key, value] of Object.entries(options.where)) {
        query = query.eq(key, value);
      }
    }
    const { data, error } = await query.limit(1).single();
    if (error && error.code !== 'PGRST116') throw new Error(`Supabase findOne error: ${error.message}`);
    return (data as UserEntity) || null;
  }

  async findByUuid(uuid: string, options?: FindOptions): Promise<UserEntity | null> {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from(this.tableName)
      .select(options?.attributes?.join(',') || '*')
      .eq('uuid', uuid)
      .single();
    if (error && error.code !== 'PGRST116') throw new Error(`Supabase findByUuid error: ${error.message}`);
    return (data as UserEntity) || null;
  }

  async update(uuid: string, data: UpdateUserData): Promise<[number]> {
    const supabase = await getSupabaseClient();
    const { data: result, error } = await supabase
      .from(this.tableName)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('uuid', uuid)
      .select();
    if (error) throw new Error(`Supabase update error: ${error.message}`);
    return [result?.length || 0];
  }

  async delete(uuid: string): Promise<number> {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from(this.tableName).delete().eq('uuid', uuid).select();
    if (error) throw new Error(`Supabase delete error: ${error.message}`);
    return data?.length || 0;
  }

  async count(options?: CountOptions): Promise<number> {
    const supabase = await getSupabaseClient();
    let query = supabase.from(this.tableName).select('*', { count: 'exact', head: true });
    if (options?.where) {
      for (const [key, value] of Object.entries(options.where)) {
        query = query.eq(key, value);
      }
    }
    const { count, error } = await query;
    if (error) throw new Error(`Supabase count error: ${error.message}`);
    return count || 0;
  }

  async exists(uuid: string): Promise<boolean> {
    return (await this.count({ where: { uuid } })) > 0;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from(this.tableName).select('*').eq('email', email).single();
    if (error && error.code !== 'PGRST116') throw new Error(`Supabase findByEmail error: ${error.message}`);
    return (data as UserEntity) || null;
  }

  async findByMobile(mobile: string): Promise<UserEntity | null> {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from(this.tableName).select('*').eq('mobile', mobile).single();
    if (error && error.code !== 'PGRST116') throw new Error(`Supabase findByMobile error: ${error.message}`);
    return (data as UserEntity) || null;
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from(this.tableName).select('*').eq('username', username).single();
    if (error && error.code !== 'PGRST116') throw new Error(`Supabase findByUsername error: ${error.message}`);
    return (data as UserEntity) || null;
  }

  async isEmailExists(email: string, excludeUuid?: string): Promise<boolean> {
    const supabase = await getSupabaseClient();
    let query = supabase.from(this.tableName).select('*', { count: 'exact', head: true }).eq('email', email);
    if (excludeUuid) query = query.neq('uuid', excludeUuid);
    const { count } = await query;
    return (count || 0) > 0;
  }

  async isMobileExists(mobile: string, excludeUuid?: string): Promise<boolean> {
    const supabase = await getSupabaseClient();
    let query = supabase.from(this.tableName).select('*', { count: 'exact', head: true }).eq('mobile', mobile);
    if (excludeUuid) query = query.neq('uuid', excludeUuid);
    const { count } = await query;
    return (count || 0) > 0;
  }

  async isUsernameExists(username: string, excludeUuid?: string): Promise<boolean> {
    const supabase = await getSupabaseClient();
    let query = supabase.from(this.tableName).select('*', { count: 'exact', head: true }).eq('username', username);
    if (excludeUuid) query = query.neq('uuid', excludeUuid);
    const { count } = await query;
    return (count || 0) > 0;
  }

  async findAllWithFilters(query: UserQueryParams): Promise<{ rows: UserEntity[]; count: number }> {
    const supabase = await getSupabaseClient();
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;
    const sortDirection = query.sort === '-1' || query.sort === 'DESC';
    const sortField = query.field || 'created_at';

    let countQuery = supabase.from(this.tableName).select('*', { count: 'exact', head: true });
    let dataQuery = supabase.from(this.tableName).select('id, uuid, name, email, is_active, created_at, updated_at');

    if (query.search) {
      const searchPattern = `%${query.search}%`;
      countQuery = countQuery.or(`name.ilike.${searchPattern},email.ilike.${searchPattern}`);
      dataQuery = dataQuery.or(`name.ilike.${searchPattern},email.ilike.${searchPattern}`);
    }

    dataQuery = dataQuery.order(sortField, { ascending: !sortDirection }).range(offset, offset + limit - 1);

    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);
    return { rows: (dataResult.data || []) as UserEntity[], count: countResult.count || 0 };
  }

  async findByUuidWithLoginDetails(uuid: string): Promise<UserEntity | null> {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        id, uuid, name, email, is_active, isd_code, mobile,
        email_verified_at, mobile_verified_at, profile_photo, created_at,
        login_details:personal_access_tokens(device_type, device_name, last_used_at, access_token_expired_at)
      `)
      .eq('uuid', uuid)
      .single();
    if (error && error.code !== 'PGRST116') throw new Error(`Supabase error: ${error.message}`);
    return (data as UserEntity) || null;
  }

  async changeStatus(uuid: string, is_active: boolean): Promise<[number]> {
    return await this.update(uuid, { is_active });
  }

  async updateOtp(uuid: string, type: 'email' | 'mobile', otp: number, expiredAt: Date): Promise<[number]> {
    const updateData: any = {};
    if (type === 'email') {
      updateData.email_otp = otp;
      updateData.email_otp_expired_at = expiredAt.toISOString();
    } else {
      updateData.mobile_otp = otp;
      updateData.mobile_otp_expired_at = expiredAt.toISOString();
    }
    return await this.update(uuid, updateData);
  }

  async verifyOtp(uuid: string, type: 'email' | 'mobile'): Promise<[number]> {
    const updateData: any = {};
    if (type === 'email') {
      updateData.email_verified_at = new Date().toISOString();
      updateData.email_otp = null;
      updateData.email_otp_expired_at = null;
    } else {
      updateData.mobile_verified_at = new Date().toISOString();
      updateData.mobile_otp = null;
      updateData.mobile_otp_expired_at = null;
    }
    return await this.update(uuid, updateData);
  }
}
