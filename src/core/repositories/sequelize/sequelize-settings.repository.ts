/**
 * ============================================
 * SEQUELIZE SETTINGS REPOSITORY
 * ============================================
 */

import { Injectable, Inject } from '@nestjs/common';
import { SETTINGS_REPOSITORY } from '../../../config/constants';
import { Settings } from '../../../models/Settings';
import { FindOptions, CountOptions, FindAndCountResult } from '../base.repository.interface';
import { ISettingsRepository, SettingsEntity, CreateSettingsData, UpdateSettingsData } from '../settings.repository.interface';

@Injectable()
export class SequelizeSettingsRepository implements ISettingsRepository {
  constructor(@Inject(SETTINGS_REPOSITORY) private settingsModel: typeof Settings) {}

  private toEntity(model: Settings | null): SettingsEntity | null {
    if (!model) return null;
    return model.get({ plain: true }) as SettingsEntity;
  }

  private toEntities(models: Settings[]): SettingsEntity[] {
    return models.map((m) => this.toEntity(m) as SettingsEntity);
  }

  async create(data: CreateSettingsData): Promise<SettingsEntity> {
    const model = await this.settingsModel.create(data as any);
    return this.toEntity(model) as SettingsEntity;
  }

  async findAll(options?: FindOptions): Promise<SettingsEntity[]> {
    const models = await this.settingsModel.findAll(options as any);
    return this.toEntities(models);
  }

  async findAndCountAll(options?: FindOptions): Promise<FindAndCountResult<SettingsEntity>> {
    const result = await this.settingsModel.findAndCountAll(options as any);
    return { rows: this.toEntities(result.rows), count: result.count };
  }

  async findOne(options: FindOptions): Promise<SettingsEntity | null> {
    const model = await this.settingsModel.findOne(options as any);
    return this.toEntity(model);
  }

  async findByUuid(uuid: string, options?: FindOptions): Promise<SettingsEntity | null> {
    return null; // Settings don't have uuid
  }

  async update(uuid: string, data: UpdateSettingsData): Promise<[number]> {
    return await this.settingsModel.update({ ...data, updated_at: new Date() }, { where: { key: uuid } });
  }

  async delete(uuid: string): Promise<number> {
    return await this.settingsModel.destroy({ where: { key: uuid } });
  }

  async count(options?: CountOptions): Promise<number> {
    const result = await this.settingsModel.count(options as any);
    return typeof result === 'number' ? result : (result as any[]).length;
  }

  async exists(uuid: string): Promise<boolean> {
    return (await this.settingsModel.count({ where: { key: uuid } })) > 0;
  }

  async findByKey(key: string): Promise<SettingsEntity | null> {
    const model = await this.settingsModel.findOne({ where: { key } });
    return this.toEntity(model);
  }

  async upsert(key: string, value: string): Promise<SettingsEntity> {
    const existing = await this.settingsModel.findOne({ where: { key } });
    if (existing) {
      await this.settingsModel.update({ value, updated_at: new Date() }, { where: { key } });
      return { ...existing.get({ plain: true }), value } as SettingsEntity;
    }
    const model = await this.settingsModel.create({ key, value } as any);
    return this.toEntity(model) as SettingsEntity;
  }
}
