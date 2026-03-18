/**
 * ============================================
 * PERMISSION REPOSITORY INTERFACE
 * ============================================
 */

import { IBaseRepository } from './base.repository.interface';

export interface PermissionEntity {
  id?: number;
  uuid?: string;
  name: string;
  guard_name?: string;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export interface CreatePermissionData {
  uuid?: string;
  name: string;
  guard_name?: string;
}

export interface UpdatePermissionData {
  name?: string;
  guard_name?: string;
}

export interface PermissionQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface IPermissionRepository
  extends IBaseRepository<PermissionEntity, CreatePermissionData, UpdatePermissionData> {
  findByName(name: string): Promise<PermissionEntity | null>;
  isNameExists(name: string, excludeId?: number): Promise<boolean>;
  findAllWithFilters(query: PermissionQueryParams): Promise<{ rows: PermissionEntity[]; count: number }>;
}

export const PERMISSION_REPOSITORY = 'PERMISSION_REPOSITORY';
