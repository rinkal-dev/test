/**
 * ============================================
 * ADMIN REPOSITORY INTERFACE
 * ============================================
 */

import { IBaseRepository } from './base.repository.interface';

export interface AdminEntity {
  id?: number;
  uuid: string;
  name: string;
  email: string;
  password?: string;
  remember_token?: string | null;
  is_active: boolean;
  is_super_admin?: boolean;
  locale?: string;
  profile_photo?: string | null;
  created_at?: Date | null;
  updated_at?: Date | null;
  roles?: any[];
}

export interface CreateAdminData {
  uuid: string;
  name: string;
  email: string;
  password: string;
  is_active?: boolean;
  is_super_admin?: boolean;
  locale?: string;
}

export interface UpdateAdminData {
  name?: string;
  email?: string;
  password?: string;
  remember_token?: string;
  is_active?: boolean;
  is_super_admin?: boolean;
  locale?: string;
  profile_photo?: string;
}

export interface AdminQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  field?: string;
  sort?: string;
}

export interface IAdminRepository
  extends IBaseRepository<AdminEntity, CreateAdminData, UpdateAdminData> {
  findByEmail(email: string): Promise<AdminEntity | null>;
  findByEmailWithRoles(email: string): Promise<AdminEntity | null>;
  isEmailExists(email: string, excludeUuid?: string): Promise<boolean>;
  findAllWithFilters(query: AdminQueryParams): Promise<{ rows: AdminEntity[]; count: number }>;
  findByUuidWithRoles(uuid: string): Promise<AdminEntity | null>;
  changeStatus(uuid: string, is_active: boolean): Promise<[number]>;
  updatePassword(uuid: string, password: string): Promise<[number]>;
}

export const ADMIN_REPOSITORY = 'ADMIN_REPOSITORY';
