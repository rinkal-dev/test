/**
 * ============================================
 * USER REPOSITORY INTERFACE
 * ============================================
 */

import { IBaseRepository, FindOptions } from './base.repository.interface';

export interface UserEntity {
  id?: number;
  uuid: string;
  name: string;
  username: string;
  email?: string | null;
  password?: string;
  remember_token?: string | null;
  locale: string;
  is_active: boolean;
  isd_code?: string | null;
  mobile?: string | null;
  email_otp?: number | null;
  email_otp_expired_at?: Date | null;
  email_verified_at?: Date | null;
  mobile_otp?: number | null;
  mobile_otp_expired_at?: Date | null;
  mobile_verified_at?: Date | null;
  profile_photo?: string | null;
  created_at?: Date | null;
  updated_at?: Date | null;
  login_details?: any[];
}

export interface CreateUserData {
  uuid: string;
  name: string;
  username: string;
  email?: string;
  password: string;
  locale?: string;
  is_active?: boolean;
  isd_code?: string;
  mobile?: string;
}

export interface UpdateUserData {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  remember_token?: string;
  locale?: string;
  is_active?: boolean;
  isd_code?: string;
  mobile?: string;
  email_otp?: number;
  email_otp_expired_at?: Date;
  email_verified_at?: Date;
  mobile_otp?: number;
  mobile_otp_expired_at?: Date;
  mobile_verified_at?: Date;
  profile_photo?: string;
}

export interface UserQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  field?: string;
  sort?: string;
  filters?: string;
  name?: string;
  email?: string;
  is_active?: string;
}

export interface IUserRepository
  extends IBaseRepository<UserEntity, CreateUserData, UpdateUserData> {

  findByEmail(email: string): Promise<UserEntity | null>;
  findByMobile(mobile: string): Promise<UserEntity | null>;
  findByUsername(username: string): Promise<UserEntity | null>;
  isEmailExists(email: string, excludeUuid?: string): Promise<boolean>;
  isMobileExists(mobile: string, excludeUuid?: string): Promise<boolean>;
  isUsernameExists(username: string, excludeUuid?: string): Promise<boolean>;
  findAllWithFilters(query: UserQueryParams): Promise<{ rows: UserEntity[]; count: number }>;
  findByUuidWithLoginDetails(uuid: string): Promise<UserEntity | null>;
  changeStatus(uuid: string, is_active: boolean): Promise<[number]>;
  updateOtp(uuid: string, type: 'email' | 'mobile', otp: number, expiredAt: Date): Promise<[number]>;
  verifyOtp(uuid: string, type: 'email' | 'mobile'): Promise<[number]>;
}

export const USER_REPOSITORY = 'USER_REPOSITORY';
