/**
 * ============================================
 * SEQUELIZE USER REPOSITORY IMPLEMENTATION
 * ============================================
 */

import { Injectable, Inject } from '@nestjs/common';
import { Op } from 'sequelize';
import { USERS_REPOSITORY } from '../../../config/constants';
import { Users } from '../../../models/Users';
import { PersonalAccessTokens } from '../../../models/PersonalAccessTokens';
import {
  FindOptions,
  CountOptions,
  FindAndCountResult,
} from '../base.repository.interface';
import {
  IUserRepository,
  UserEntity,
  CreateUserData,
  UpdateUserData,
  UserQueryParams,
} from '../user.repository.interface';

@Injectable()
export class SequelizeUserRepository implements IUserRepository {
  constructor(
    @Inject(USERS_REPOSITORY) private usersModel: typeof Users,
  ) {}

  private toEntity(model: Users | null): UserEntity | null {
    if (!model) return null;
    const plain = model.get({ plain: true });
    return plain as UserEntity;
  }

  private toEntities(models: Users[]): UserEntity[] {
    return models.map((m) => this.toEntity(m) as UserEntity);
  }

  private buildWhereClause(where?: Record<string, any>): any {
    if (!where) return {};
    const sequelizeWhere: any = {};
    for (const [key, value] of Object.entries(where)) {
      if (key === '$or') {
        sequelizeWhere[Op.or] = value.map((condition: Record<string, any>) =>
          this.buildWhereClause(condition),
        );
      } else if (typeof value === 'object' && value !== null) {
        if ('$like' in value) {
          sequelizeWhere[key] = { [Op.like]: value.$like };
        } else if ('$ne' in value) {
          sequelizeWhere[key] = { [Op.ne]: value.$ne };
        } else if ('$eq' in value) {
          sequelizeWhere[key] = { [Op.eq]: value.$eq };
        } else {
          sequelizeWhere[key] = value;
        }
      } else {
        sequelizeWhere[key] = value;
      }
    }
    return sequelizeWhere;
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    const model = await this.usersModel.create(data as any);
    return this.toEntity(model) as UserEntity;
  }

  async findAll(options?: FindOptions): Promise<UserEntity[]> {
    const sequelizeOptions: any = {};
    if (options?.where) {
      sequelizeOptions.where = this.buildWhereClause(options.where);
    }
    if (options?.attributes) {
      sequelizeOptions.attributes = options.attributes;
    }
    if (options?.order) {
      sequelizeOptions.order = options.order;
    }
    if (options?.offset !== undefined) {
      sequelizeOptions.offset = options.offset;
    }
    if (options?.limit !== undefined) {
      sequelizeOptions.limit = options.limit;
    }
    const models = await this.usersModel.findAll(sequelizeOptions);
    return this.toEntities(models);
  }

  async findAndCountAll(options?: FindOptions): Promise<FindAndCountResult<UserEntity>> {
    const sequelizeOptions: any = {};
    if (options?.where) {
      sequelizeOptions.where = this.buildWhereClause(options.where);
    }
    if (options?.attributes) {
      sequelizeOptions.attributes = options.attributes;
    }
    if (options?.order) {
      sequelizeOptions.order = options.order;
    }
    if (options?.offset !== undefined) {
      sequelizeOptions.offset = options.offset;
    }
    if (options?.limit !== undefined) {
      sequelizeOptions.limit = options.limit;
    }
    const result = await this.usersModel.findAndCountAll(sequelizeOptions);
    return {
      rows: this.toEntities(result.rows),
      count: result.count,
    };
  }

  async findOne(options: FindOptions): Promise<UserEntity | null> {
    const sequelizeOptions: any = {};
    if (options?.where) {
      sequelizeOptions.where = this.buildWhereClause(options.where);
    }
    if (options?.attributes) {
      sequelizeOptions.attributes = options.attributes;
    }
    const model = await this.usersModel.findOne(sequelizeOptions);
    return this.toEntity(model);
  }

  async findByUuid(uuid: string, options?: FindOptions): Promise<UserEntity | null> {
    const sequelizeOptions: any = { where: { uuid } };
    if (options?.attributes) {
      sequelizeOptions.attributes = options.attributes;
    }
    const model = await this.usersModel.findOne(sequelizeOptions);
    return this.toEntity(model);
  }

  async update(uuid: string, data: UpdateUserData): Promise<[number]> {
    return await this.usersModel.update(
      { ...data, updated_at: new Date() },
      { where: { uuid } },
    );
  }

  async delete(uuid: string): Promise<number> {
    return await this.usersModel.destroy({ where: { uuid } });
  }

  async count(options?: CountOptions): Promise<number> {
    const sequelizeOptions: any = {};
    if (options?.where) {
      sequelizeOptions.where = this.buildWhereClause(options.where);
    }
    const result = await this.usersModel.count(sequelizeOptions);
    return typeof result === 'number' ? result : (result as any[]).length;
  }

  async exists(uuid: string): Promise<boolean> {
    const count = await this.usersModel.count({ where: { uuid } });
    return count > 0;
  }

  // User-specific methods
  async findByEmail(email: string): Promise<UserEntity | null> {
    const model = await this.usersModel.findOne({ where: { email } });
    return this.toEntity(model);
  }

  async findByMobile(mobile: string): Promise<UserEntity | null> {
    const model = await this.usersModel.findOne({ where: { mobile } });
    return this.toEntity(model);
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    const model = await this.usersModel.findOne({ where: { username } });
    return this.toEntity(model);
  }

  async isEmailExists(email: string, excludeUuid?: string): Promise<boolean> {
    const where: any = { email };
    if (excludeUuid) {
      where.uuid = { [Op.ne]: excludeUuid };
    }
    const count = await this.usersModel.count({ where });
    return count > 0;
  }

  async isMobileExists(mobile: string, excludeUuid?: string): Promise<boolean> {
    const where: any = { mobile };
    if (excludeUuid) {
      where.uuid = { [Op.ne]: excludeUuid };
    }
    const count = await this.usersModel.count({ where });
    return count > 0;
  }

  async isUsernameExists(username: string, excludeUuid?: string): Promise<boolean> {
    const where: any = { username };
    if (excludeUuid) {
      where.uuid = { [Op.ne]: excludeUuid };
    }
    const count = await this.usersModel.count({ where });
    return count > 0;
  }

  async findAllWithFilters(query: UserQueryParams): Promise<{ rows: UserEntity[]; count: number }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;
    const sortDirection = query.sort === '-1' || query.sort === 'DESC' ? 'DESC' : 'ASC';
    const sortField = query.field || 'created_at';

    let where: any = {};

    if (query.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${query.search}%` } },
        { email: { [Op.like]: `%${query.search}%` } },
      ];
    }

    if (query.name) {
      where.name = { [Op.like]: `%${query.name}%` };
    }
    if (query.email) {
      where.email = { [Op.like]: `%${query.email}%` };
    }
    if (query.is_active !== undefined) {
      where.is_active = query.is_active === 'true' ? 1 : 0;
    }

    const result = await this.usersModel.findAndCountAll({
      where,
      attributes: ['id', 'uuid', 'name', 'email', 'is_active', 'created_at', 'updated_at'],
      order: [[sortField, sortDirection]],
      offset,
      limit,
    });

    return {
      rows: this.toEntities(result.rows),
      count: result.count,
    };
  }

  async findByUuidWithLoginDetails(uuid: string): Promise<UserEntity | null> {
    const model = await this.usersModel.findOne({
      where: { uuid },
      attributes: [
        'id', 'uuid', 'name', 'email', 'is_active', 'isd_code', 'mobile',
        'email_verified_at', 'mobile_verified_at', 'profile_photo', 'created_at',
      ],
      include: {
        model: PersonalAccessTokens,
        attributes: ['device_type', 'device_name', 'last_used_at', 'access_token_expired_at'],
      },
    });
    return this.toEntity(model);
  }

  async changeStatus(uuid: string, is_active: boolean): Promise<[number]> {
    return await this.usersModel.update(
      { is_active, updated_at: new Date() },
      { where: { uuid } },
    );
  }

  async updateOtp(uuid: string, type: 'email' | 'mobile', otp: number, expiredAt: Date): Promise<[number]> {
    const updateData: any = { updated_at: new Date() };
    if (type === 'email') {
      updateData.email_otp = otp;
      updateData.email_otp_expired_at = expiredAt;
    } else {
      updateData.mobile_otp = otp;
      updateData.mobile_otp_expired_at = expiredAt;
    }
    return await this.usersModel.update(updateData, { where: { uuid } });
  }

  async verifyOtp(uuid: string, type: 'email' | 'mobile'): Promise<[number]> {
    const updateData: any = { updated_at: new Date() };
    if (type === 'email') {
      updateData.email_verified_at = new Date();
      updateData.email_otp = null;
      updateData.email_otp_expired_at = null;
    } else {
      updateData.mobile_verified_at = new Date();
      updateData.mobile_otp = null;
      updateData.mobile_otp_expired_at = null;
    }
    return await this.usersModel.update(updateData, { where: { uuid } });
  }
}
