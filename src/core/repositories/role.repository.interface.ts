/**
 * ============================================
 * ROLE REPOSITORY INTERFACE
 * ============================================
 */

import { IBaseRepository } from './base.repository.interface';

export interface RoleEntity {
  id?: number;
  uuid?: string;
  name: string;
  guard_name?: string;
  created_at?: Date | null;
  updated_at?: Date | null;
  permissions?: PermissionEntity[];
}

export interface PermissionEntity {
  id?: number;
  uuid?: string;
  name: string;
  guard_name?: string;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export interface CreateRoleData {
  uuid?: string;
  name: string;
  guard_name?: string;
}

export interface UpdateRoleData {
  name?: string;
  guard_name?: string;
}

export interface RoleQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface IRoleRepository
  extends IBaseRepository<RoleEntity, CreateRoleData, UpdateRoleData> {
  findByName(name: string): Promise<RoleEntity | null>;
  isNameExists(name: string, excludeId?: number): Promise<boolean>;
  findAllWithPermissions(): Promise<RoleEntity[]>;
  findByIdWithPermissions(id: number): Promise<RoleEntity | null>;
  findAllExcluding(excludeIds: number[]): Promise<RoleEntity[]>;
  findAllWithFilters(query: RoleQueryParams): Promise<{ rows: RoleEntity[]; count: number }>;
  syncPermissions(roleId: number, permissionIds: number[]): Promise<void>;
}

export const ROLE_REPOSITORY = 'ROLE_REPOSITORY';
