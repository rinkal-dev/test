/**
 * ============================================
 * SEQUELIZE PERMISSION REPOSITORY
 * ============================================
 */

import { Injectable, Inject } from '@nestjs/common';
import { Op } from 'sequelize';
import { PERMISSIONS_REPOSITORY } from '../../../config/constants';
import { Permissions } from '../../../models/Permissions';
import { FindOptions, CountOptions, FindAndCountResult } from '../base.repository.interface';
import { IPermissionRepository, PermissionEntity, CreatePermissionData, UpdatePermissionData, PermissionQueryParams } from '../permission.repository.interface';

@Injectable()
export class SequelizePermissionRepository implements IPermissionRepository {
  constructor(@Inject(PERMISSIONS_REPOSITORY) private permissionsModel: typeof Permissions) {}

  private toEntity(model: Permissions | null): PermissionEntity | null {
    if (!model) return null;
    return model.get({ plain: true }) as PermissionEntity;
  }

  private toEntities(models: Permissions[]): PermissionEntity[] {
    return models.map((m) => this.toEntity(m) as PermissionEntity);
  }

  async create(data: CreatePermissionData): Promise<PermissionEntity> {
    const model = await this.permissionsModel.create(data as any);
    return this.toEntity(model) as PermissionEntity;
  }

  async findAll(options?: FindOptions): Promise<PermissionEntity[]> {
    const models = await this.permissionsModel.findAll(options as any);
    return this.toEntities(models);
  }

  async findAndCountAll(options?: FindOptions): Promise<FindAndCountResult<PermissionEntity>> {
    const result = await this.permissionsModel.findAndCountAll(options as any);
    return { rows: this.toEntities(result.rows), count: result.count };
  }

  async findOne(options: FindOptions): Promise<PermissionEntity | null> {
    const model = await this.permissionsModel.findOne(options as any);
    return this.toEntity(model);
  }

  async findByUuid(uuid: string, options?: FindOptions): Promise<PermissionEntity | null> {
    const model = await this.permissionsModel.findOne({ where: { uuid }, ...options } as any);
    return this.toEntity(model);
  }

  async update(uuid: string, data: UpdatePermissionData): Promise<[number]> {
    return await this.permissionsModel.update({ ...data, updated_at: new Date() }, { where: { uuid } });
  }

  async delete(uuid: string): Promise<number> {
    return await this.permissionsModel.destroy({ where: { uuid } });
  }

  async count(options?: CountOptions): Promise<number> {
    const result = await this.permissionsModel.count(options as any);
    return typeof result === 'number' ? result : (result as any[]).length;
  }

  async exists(uuid: string): Promise<boolean> {
    return (await this.permissionsModel.count({ where: { uuid } })) > 0;
  }

  async findByName(name: string): Promise<PermissionEntity | null> {
    const model = await this.permissionsModel.findOne({ where: { name } });
    return this.toEntity(model);
  }

  async isNameExists(name: string, excludeId?: number): Promise<boolean> {
    const where: any = { name };
    if (excludeId) where.id = { [Op.ne]: excludeId };
    return (await this.permissionsModel.count({ where })) > 0;
  }

  async findAllWithFilters(query: PermissionQueryParams): Promise<{ rows: PermissionEntity[]; count: number }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    let where: any = {};
    if (query.search) {
      where.name = { [Op.like]: `%${query.search}%` };
    }

    const result = await this.permissionsModel.findAndCountAll({
      where,
      order: [['id', 'DESC']],
      offset,
      limit,
    });

    return { rows: this.toEntities(result.rows), count: result.count };
  }
}
