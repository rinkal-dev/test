/**
 * ============================================
 * SETTINGS REPOSITORY INTERFACE
 * ============================================
 */

import { IBaseRepository } from './base.repository.interface';

export interface SettingsEntity {
  id?: number;
  key: string;
  value?: string | null;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export interface CreateSettingsData {
  key: string;
  value?: string;
}

export interface UpdateSettingsData {
  key?: string;
  value?: string;
}

export interface ISettingsRepository
  extends IBaseRepository<SettingsEntity, CreateSettingsData, UpdateSettingsData> {
  findByKey(key: string): Promise<SettingsEntity | null>;
  upsert(key: string, value: string): Promise<SettingsEntity>;
}

export const SETTINGS_REPOSITORY = 'SETTINGS_REPOSITORY';
