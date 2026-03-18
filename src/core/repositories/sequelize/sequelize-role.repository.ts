/**
 * ============================================
 * SEQUELIZE ROLE REPOSITORY
 * ============================================
 */

import { Injectable, Inject } from '@nestjs/common';
import { Op } from 'sequelize';
import { ROLES_REPOSITORY, ROLE_HAS_PERMISSIONS_REPOSITORY } from '../../../config/constants';
import { Roles } from '../../../models/Roles';
import { Permissions } from '../../../models/Permissions';
import { RoleHasPermissions } from '../../../models/RoleHasPermissions';
import { FindOptions, CountOptions, FindAndCountResult } from '../base.repository.interface';
import { IRoleRepository, RoleEntity, CreateRoleData, UpdateRoleData, RoleQueryParams } from '../role.repository.interface';

@Injectable()
export class SequelizeRoleRepository implements IRoleRepository {
  constructor(
    @Inject(ROLES_REPOSITORY) private rolesModel: typeof Roles,
    @Inject(ROLE_HAS_PERMISSIONS_REPOSITORY) private roleHasPermissionsModel: typeof RoleHasPermissions,
  ) {}

  private toEntity(model: Roles | null): RoleEntity | null {
    if (!model) return null;
    return model.get({ plain: true }) as RoleEntity;
  }

  private toEntities(models: Roles[]): RoleEntity[] {
    return models.map((m) => this.toEntity(m) as RoleEntity);
  }

  async create(data: CreateRoleData): Promise<RoleEntity> {
    const model = await this.rolesModel.create(data as any);
    return this.toEntity(model) as RoleEntity;
  }

  async findAll(options?: FindOptions): Promise<RoleEntity[]> {
    const models = await this.rolesModel.findAll(options as any);
    return this.toEntities(models);
  }

  async findAndCountAll(options?: FindOptions): Promise<FindAndCountResult<RoleEntity>> {
    const result = await this.rolesModel.findAndCountAll(options as any);
    return { rows: this.toEntities(result.rows), count: result.count };
  }

  async findOne(options: FindOptions): Promise<RoleEntity | null> {
    const model = await this.rolesModel.findOne(options as any);
    return this.toEntity(model);
  }

  async findByUuid(uuid: string, options?: FindOptions): Promise<RoleEntity | null> {
    const model = await this.rolesModel.findOne({ where: { uuid }, ...options } as any);
    return this.toEntity(model);
  }

  async update(uuid: string, data: UpdateRoleData): Promise<[number]> {
    return await this.rolesModel.update({ ...data, updated_at: new Date() }, { where: { uuid } });
  }

  async delete(uuid: string): Promise<number> {
    return await this.rolesModel.destroy({ where: { uuid } });
  }

  async count(options?: CountOptions): Promise<number> {
    const result = await this.rolesModel.count(options as any);
    return typeof result === 'number' ? result : (result as any[]).length;
  }

  async exists(uuid: string): Promise<boolean> {
    return (await this.rolesModel.count({ where: { uuid } })) > 0;
  }

  async findByName(name: string): Promise<RoleEntity | null> {
    const model = await this.rolesModel.findOne({ where: { name } });
    return this.toEntity(model);
  }

  async isNameExists(name: string, excludeId?: number): Promise<boolean> {
    const where: any = { name };
    if (excludeId) where.id = { [Op.ne]: excludeId };
    return (await this.rolesModel.count({ where })) > 0;
  }

  async findAllWithPermissions(): Promise<RoleEntity[]> {
    const models = await this.rolesModel.findAll({
      include: [{ model: Permissions, through: { attributes: [] } }],
    });
    return this.toEntities(models);
  }

  async findByIdWithPermissions(id: number): Promise<RoleEntity | null> {
    const model = await this.rolesModel.findOne({
      where: { id },
      include: [{ model: Permissions, through: { attributes: [] } }],
    });
    return this.toEntity(model);
  }

  async findAllExcluding(excludeIds: number[]): Promise<RoleEntity[]> {
    const models = await this.rolesModel.findAll({
      where: { id: { [Op.notIn]: excludeIds } },
    });
    return this.toEntities(models);
  }

  async findAllWithFilters(query: RoleQueryParams): Promise<{ rows: RoleEntity[]; count: number }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    let where: any = {};
    if (query.search) {
      where.name = { [Op.like]: `%${query.search}%` };
    }

    const result = await this.rolesModel.findAndCountAll({
      where,
      include: [{ model: Permissions, through: { attributes: [] } }],
      order: [['id', 'DESC']],
      offset,
      limit,
    });

    return { rows: this.toEntities(result.rows), count: result.count };
  }

  async syncPermissions(roleId: number, permissionIds: number[]): Promise<void> {
    await this.roleHasPermissionsModel.destroy({ where: { role_id: roleId } });
    if (permissionIds.length > 0) {
      const records = permissionIds.map((permissionId) => ({
        role_id: roleId,
        permission_id: permissionId,
      }));
      await this.roleHasPermissionsModel.bulkCreate(records);
    }
  }
}
