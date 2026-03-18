/**
 * System Settings Service
 *
 * Manages system configuration stored in the database.
 * Provides caching, encryption, and fallback to environment variables.
 *
 * SECURITY FEATURES:
 * - Only whitelisted settings can be modified
 * - Sensitive values are encrypted at rest
 * - Values are masked in API responses
 * - Changes are logged with user info
 */

import { Injectable, Inject, OnModuleInit, BadRequestException, Logger } from '@nestjs/common';
import { SystemSettings } from '../../../models/SystemSettings';
import { v4 as uuidv4 } from 'uuid';
import {
  SETTINGS_DEFINITIONS,
  getSettingDefinition,
  isAllowedSetting,
  validateSettingValue,
  getAllCategories,
} from '../../../config/system-settings.config';
import {
  encryptValue,
  decryptValue,
  maskValue,
  isEncrypted,
} from '../../../helpers/encryption.helper';
import {
  initializeSettingsCache,
  updateSettingCache,
  removeSettingCache,
  isSettingsCacheInitialized,
} from '../../../helpers/general';

// Repository constant
export const SYSTEM_SETTINGS_REPOSITORY = 'SYSTEM_SETTINGS_REPOSITORY';

// Local reference to cache for this service
let settingsCache: Map<string, string> = new Map();

export interface SettingResponse {
  key: string;
  value: string; // Masked for secrets
  rawValue?: string; // Only for non-secrets
  category: string;
  label: string;
  description: string;
  isSecret: boolean;
  isConfigured: boolean;
  updatedAt?: Date;
}

export interface CategorySettings {
  category: string;
  label: string;
  settings: SettingResponse[];
}

@Injectable()
export class SystemSettingsService implements OnModuleInit {
  private readonly logger = new Logger(SystemSettingsService.name);

  constructor(
    @Inject(SYSTEM_SETTINGS_REPOSITORY)
    private readonly settingsRepository: typeof SystemSettings,
  ) {}

  /**
   * Initialize cache on module load
   */
  async onModuleInit() {
    await this.refreshCache();
  }

  /**
   * Refresh the in-memory cache from database
   */
  async refreshCache(): Promise<void> {
    try {
      const settings = await this.settingsRepository.findAll();

      settingsCache.clear();

      for (const setting of settings) {
        let value = setting.value;

        // Decrypt if encrypted
        if (setting.is_encrypted && value) {
          value = decryptValue(value);
        }

        settingsCache.set(setting.key, value);
      }

      // Initialize the global cache in general.ts
      initializeSettingsCache(settingsCache);

      this.logger.log(`Settings cache refreshed with ${settings.length} entries`);
    } catch (error) {
      this.logger.error('Failed to refresh settings cache:', error);
    }
  }

  /**
   * Get all settings grouped by category
   */
  async getAllSettings(): Promise<CategorySettings[]> {
    const dbSettings = await this.settingsRepository.findAll({
      order: [['category', 'ASC'], ['key', 'ASC']],
    });

    const dbSettingsMap = new Map<string, SystemSettings>();
    for (const setting of dbSettings) {
      dbSettingsMap.set(setting.key, setting);
    }

    const categories = getAllCategories();
    const result: CategorySettings[] = [];

    for (const category of categories) {
      const categorySettings: SettingResponse[] = [];

      // Get all definitions for this category
      const definitions = Object.values(SETTINGS_DEFINITIONS).filter(
        (d) => d.category === category,
      );

      for (const def of definitions) {
        const dbSetting = dbSettingsMap.get(def.key);
        const envValue = process.env[def.key];

        let displayValue = '';
        let isConfigured = false;

        if (dbSetting?.value) {
          // Value from database
          let actualValue = dbSetting.value;
          if (dbSetting.is_encrypted) {
            actualValue = decryptValue(actualValue);
          }

          displayValue = def.isSecret ? maskValue(actualValue) : actualValue;
          isConfigured = true;
        } else if (envValue) {
          // Value from environment
          displayValue = def.isSecret ? maskValue(envValue) : envValue;
          isConfigured = true;
        } else if (def.defaultValue) {
          // Default value
          displayValue = def.isSecret ? maskValue(def.defaultValue) : def.defaultValue;
          isConfigured = false;
        }

        categorySettings.push({
          key: def.key,
          value: displayValue,
          category: def.category,
          label: def.label,
          description: def.description,
          isSecret: def.isSecret,
          isConfigured,
          updatedAt: dbSetting?.updated_at,
        });
      }

      result.push({
        category,
        label: this.getCategoryLabel(category),
        settings: categorySettings,
      });
    }

    return result;
  }

  /**
   * Get a single setting
   */
  async getSetting(key: string): Promise<SettingResponse | null> {
    const definition = getSettingDefinition(key);
    if (!definition) {
      return null;
    }

    const dbSetting = await this.settingsRepository.findOne({
      where: { key },
    });

    const envValue = process.env[key];

    let displayValue = '';
    let isConfigured = false;

    if (dbSetting?.value) {
      let actualValue = dbSetting.value;
      if (dbSetting.is_encrypted) {
        actualValue = decryptValue(actualValue);
      }
      displayValue = definition.isSecret ? maskValue(actualValue) : actualValue;
      isConfigured = true;
    } else if (envValue) {
      displayValue = definition.isSecret ? maskValue(envValue) : envValue;
      isConfigured = true;
    } else if (definition.defaultValue) {
      displayValue = definition.isSecret ? maskValue(definition.defaultValue) : definition.defaultValue;
    }

    return {
      key: definition.key,
      value: displayValue,
      category: definition.category,
      label: definition.label,
      description: definition.description,
      isSecret: definition.isSecret,
      isConfigured,
      updatedAt: dbSetting?.updated_at,
    };
  }

  /**
   * Update a setting value
   */
  async updateSetting(
    key: string,
    value: string,
    userId: number,
  ): Promise<SettingResponse> {
    // Security: Check if setting is allowed
    if (!isAllowedSetting(key)) {
      throw new BadRequestException(`Setting '${key}' is not allowed`);
    }

    const definition = getSettingDefinition(key);
    if (!definition) {
      throw new BadRequestException(`Setting '${key}' is not defined`);
    }

    // Validate value
    const validation = validateSettingValue(key, value);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    // Encrypt if secret (convert to boolean explicitly to avoid JS truthy/falsy issues)
    let storedValue = value;
    const shouldEncrypt = definition.isSecret && !!value;

    if (shouldEncrypt) {
      storedValue = encryptValue(value);
    }

    // Upsert the setting
    let setting = await this.settingsRepository.findOne({ where: { key } });

    if (setting) {
      await setting.update({
        value: storedValue,
        is_encrypted: shouldEncrypt,
        updated_by: userId,
      });
    } else {
      setting = await this.settingsRepository.create({
        uuid: uuidv4(),
        key,
        value: storedValue,
        category: definition.category,
        is_secret: definition.isSecret,
        is_encrypted: shouldEncrypt,
        description: definition.description,
        updated_by: userId,
      });
    }

    // Update both local and global cache
    settingsCache.set(key, value);
    updateSettingCache(key, value);

    this.logger.log(`Setting '${key}' updated by user ${userId}`);

    return {
      key: definition.key,
      value: definition.isSecret ? maskValue(value) : value,
      category: definition.category,
      label: definition.label,
      description: definition.description,
      isSecret: definition.isSecret,
      isConfigured: true,
      updatedAt: setting.updated_at,
    };
  }

  /**
   * Update multiple settings at once
   */
  async updateSettings(
    settings: { key: string; value: string }[],
    userId: number,
  ): Promise<{ success: number; failed: { key: string; error: string }[] }> {
    const results = {
      success: 0,
      failed: [] as { key: string; error: string }[],
    };

    for (const setting of settings) {
      try {
        await this.updateSetting(setting.key, setting.value, userId);
        results.success++;
      } catch (error) {
        results.failed.push({
          key: setting.key,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Delete a setting (revert to env/default)
   */
  async deleteSetting(key: string): Promise<boolean> {
    const deleted = await this.settingsRepository.destroy({
      where: { key },
    });

    if (deleted) {
      settingsCache.delete(key);
      removeSettingCache(key);
      this.logger.log(`Setting '${key}' deleted (reverted to env/default)`);
    }

    return deleted > 0;
  }

  /**
   * Test email configuration
   */
  async testEmailConfig(): Promise<{ success: boolean; message: string }> {
    // This will be implemented to send a test email
    return {
      success: true,
      message: 'Email configuration test not implemented yet',
    };
  }

  /**
   * Get category display label
   */
  private getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      email: 'Email Configuration',
      stripe: 'Stripe Payment Gateway',
      google: 'Google Services',
      ai: 'AI Services',
      app: 'Application Settings',
      branding: 'Branding',
    };
    return labels[category] || category.charAt(0).toUpperCase() + category.slice(1);
  }
}
