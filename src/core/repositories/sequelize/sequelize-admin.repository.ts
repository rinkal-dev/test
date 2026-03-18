/**
 * ============================================
 * SEQUELIZE ADMIN REPOSITORY IMPLEMENTATION
 * ============================================
 */

import { Injectable, Inject } from '@nestjs/common';
import { Op } from 'sequelize';
import { ADMINS_REPOSITORY } from '../../../config/constants';
import { Admins } from '../../../models/Admins';
import { Roles } from '../../../models/Roles';
import { Permissions } from '../../../models/Permissions';
import { FindOptions, CountOptions, FindAndCountResult } from '../base.repository.interface';
import { IAdminRepository, AdminEntity, CreateAdminData, UpdateAdminData, AdminQueryParams } from '../admin.repository.interface';

@Injectable()
export class SequelizeAdminRepository implements IAdminRepository {
  constructor(@Inject(ADMINS_REPOSITORY) private adminsModel: typeof Admins) {}

  private toEntity(model: Admins | null): AdminEntity | null {
    if (!model) return null;
    return model.get({ plain: true }) as AdminEntity;
  }

  private toEntities(models: Admins[]): AdminEntity[] {
    return models.map((m) => this.toEntity(m) as AdminEntity);
  }

  async create(data: CreateAdminData): Promise<AdminEntity> {
    const model = await this.adminsModel.create(data as any);
    return this.toEntity(model) as AdminEntity;
  }

  async findAll(options?: FindOptions): Promise<AdminEntity[]> {
    const models = await this.adminsModel.findAll(options as any);
    return this.toEntities(models);
  }

  async findAndCountAll(options?: FindOptions): Promise<FindAndCountResult<AdminEntity>> {
    const result = await this.adminsModel.findAndCountAll(options as any);
    return { rows: this.toEntities(result.rows), count: result.count };
  }

  async findOne(options: FindOptions): Promise<AdminEntity | null> {
    const model = await this.adminsModel.findOne(options as any);
    return this.toEntity(model);
  }

  async findByUuid(uuid: string, options?: FindOptions): Promise<AdminEntity | null> {
    const model = await this.adminsModel.findOne({ where: { uuid }, ...options } as any);
    return this.toEntity(model);
  }

  async update(uuid: string, data: UpdateAdminData): Promise<[number]> {
    return await this.adminsModel.update({ ...data, updated_at: new Date() }, { where: { uuid } });
  }

  async delete(uuid: string): Promise<number> {
    return await this.adminsModel.destroy({ where: { uuid } });
  }

  async count(options?: CountOptions): Promise<number> {
    const result = await this.adminsModel.count(options as any);
    return typeof result === 'number' ? result : (result as any[]).length;
  }

  async exists(uuid: string): Promise<boolean> {
    return (await this.adminsModel.count({ where: { uuid } })) > 0;
  }

  async findByEmail(email: string): Promise<AdminEntity | null> {
    const model = await this.adminsModel.findOne({ where: { email } });
    return this.toEntity(model);
  }

  async findByEmailWithRoles(email: string): Promise<AdminEntity | null> {
    const model = await this.adminsModel.findOne({
      where: { email },
      include: [{
        model: Roles,
        through: { attributes: [] },
        include: [{ model: Permissions, through: { attributes: [] } }],
      }],
    });
    return this.toEntity(model);
  }

  async isEmailExists(email: string, excludeUuid?: string): Promise<boolean> {
    const where: any = { email };
    if (excludeUuid) where.uuid = { [Op.ne]: excludeUuid };
    return (await this.adminsModel.count({ where })) > 0;
  }

  async findAllWithFilters(query: AdminQueryParams): Promise<{ rows: AdminEntity[]; count: number }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;
    const sortDirection = query.sort === '-1' ? 'DESC' : 'ASC';
    const sortField = query.field || 'created_at';

    let where: any = {};
    if (query.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${query.search}%` } },
        { email: { [Op.like]: `%${query.search}%` } },
      ];
    }

    const result = await this.adminsModel.findAndCountAll({
      where,
      attributes: ['id', 'uuid', 'name', 'email', 'is_active', 'created_at', 'updated_at'],
      include: [{ model: Roles, through: { attributes: [] }, attributes: ['id', 'name'] }],
      order: [[sortField, sortDirection]],
      offset,
      limit,
    });

    return { rows: this.toEntities(result.rows), count: result.count };
  }

  async findByUuidWithRoles(uuid: string): Promise<AdminEntity | null> {
    const model = await this.adminsModel.findOne({
      where: { uuid },
      include: [{
        model: Roles,
        through: { attributes: [] },
        include: [{ model: Permissions, through: { attributes: [] } }],
      }],
    });
    return this.toEntity(model);
  }

  async changeStatus(uuid: string, is_active: boolean): Promise<[number]> {
    return await this.adminsModel.update({ is_active, updated_at: new Date() }, { where: { uuid } });
  }

  async updatePassword(uuid: string, password: string): Promise<[number]> {
    return await this.adminsModel.update({ password, updated_at: new Date() }, { where: { uuid } });
  }
}
