/**
 * ============================================
 * AUTH REPOSITORIES INTERFACE
 * PersonalAccessTokens, PasswordResets, SocialLogins
 * ============================================
 */

import { IBaseRepository } from './base.repository.interface';

// ============================================
// PERSONAL ACCESS TOKENS
// ============================================
export interface PersonalAccessTokenEntity {
  id?: number;
  tokenable_type: string;
  tokenable_id: number;
  name: string;
  token: string;
  abilities?: string | null;
  device_type?: number | null;
  device_name?: string | null;
  last_used_at?: Date | null;
  access_token_expired_at?: Date | null;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export interface CreatePersonalAccessTokenData {
  tokenable_type: string;
  tokenable_id: number;
  name: string;
  token: string;
  abilities?: string;
  device_type?: number;
  device_name?: string;
  access_token_expired_at?: Date;
}

export interface UpdatePersonalAccessTokenData {
  name?: string;
  token?: string;
  abilities?: string;
  last_used_at?: Date;
  access_token_expired_at?: Date;
}

export interface IPersonalAccessTokenRepository
  extends IBaseRepository<PersonalAccessTokenEntity, CreatePersonalAccessTokenData, UpdatePersonalAccessTokenData> {
  findByToken(token: string): Promise<PersonalAccessTokenEntity | null>;
  deleteByTokenableId(tokenableType: string, tokenableId: number): Promise<number>;
  deleteExpiredTokens(tokenableType: string, tokenableId: number): Promise<number>;
  countActiveTokens(tokenableType: string, tokenableId: number): Promise<number>;
}

export const PERSONAL_ACCESS_TOKEN_REPOSITORY = 'PERSONAL_ACCESS_TOKEN_REPOSITORY';

// ============================================
// PASSWORD RESETS
// ============================================
export interface PasswordResetEntity {
  id?: number;
  email: string;
  token: string;
  created_at?: Date | null;
}

export interface CreatePasswordResetData {
  email: string;
  token: string;
}

export interface UpdatePasswordResetData {
  token?: string;
}

export interface IPasswordResetRepository
  extends IBaseRepository<PasswordResetEntity, CreatePasswordResetData, UpdatePasswordResetData> {
  findByEmail(email: string): Promise<PasswordResetEntity | null>;
  findByToken(token: string): Promise<PasswordResetEntity | null>;
  deleteByEmail(email: string): Promise<number>;
}

export const PASSWORD_RESET_REPOSITORY = 'PASSWORD_RESET_REPOSITORY';

// ============================================
// SOCIAL LOGINS
// ============================================
export interface SocialLoginEntity {
  id?: number;
  user_id: number;
  provider: string;
  provider_id: string;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export interface CreateSocialLoginData {
  user_id: number;
  provider: string;
  provider_id: string;
}

export interface UpdateSocialLoginData {
  provider_id?: string;
}

export interface ISocialLoginRepository
  extends IBaseRepository<SocialLoginEntity, CreateSocialLoginData, UpdateSocialLoginData> {
  findOrCreate(data: CreateSocialLoginData): Promise<[SocialLoginEntity, boolean]>;
  findByProviderAndId(provider: string, providerId: string): Promise<SocialLoginEntity | null>;
}

export const SOCIAL_LOGIN_REPOSITORY = 'SOCIAL_LOGIN_REPOSITORY';
