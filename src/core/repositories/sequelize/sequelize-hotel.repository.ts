/**
 * ============================================
 * SEQUELIZE HOTEL REPOSITORY IMPLEMENTATION
 * ============================================
 *
 * Implements IHotelRepository using Sequelize ORM.
 * This is the current production implementation.
 *
 * All Sequelize-specific code is contained here.
 * Services never see Sequelize - they only use the interface.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Op } from 'sequelize';
import { HOTELS_REPOSITORY } from '../../../config/constants';
import { Hotels } from '../../../models/Hotels';
import { RoomTypes } from '../../../models/RoomTypes';
import { WeddingGroups } from '../../../models/WeddingGroups';
import {
  FindOptions,
  CountOptions,
  FindAndCountResult,
} from '../base.repository.interface';
import {
  IHotelRepository,
  HotelEntity,
  CreateHotelData,
  UpdateHotelData,
  HotelQueryParams,
} from '../hotel.repository.interface';

@Injectable()
export class SequelizeHotelRepository implements IHotelRepository {
  constructor(
    @Inject(HOTELS_REPOSITORY) private hotelsModel: typeof Hotels,
  ) {}

  /**
   * Convert Sequelize model to entity
   * Handles both model instances and raw objects (when raw: true is used)
   */
  private toEntity(model: Hotels | Record<string, any> | null): HotelEntity | null {
    if (!model) return null;
    // Check if it's a Sequelize model instance (has .get method)
    // or a plain object (from raw: true queries)
    if (typeof model.get === 'function') {
      const plain = model.get({ plain: true });
      return plain as HotelEntity;
    }
    // Already a plain object
    return model as HotelEntity;
  }

  /**
   * Convert array of Sequelize models to entities
   */
  private toEntities(models: Hotels[]): HotelEntity[] {
    return models.map((m) => this.toEntity(m) as HotelEntity);
  }

  /**
   * Build Sequelize where clause from generic options
   */
  private buildWhereClause(where?: Record<string, any>): any {
    if (!where) return {};

    const sequelizeWhere: any = {};
    for (const [key, value] of Object.entries(where)) {
      if (key === '$or') {
        sequelizeWhere[Op.or] = value.map((condition: Record<string, any>) =>
          this.buildWhereClause(condition),
        );
      } else if (key === '$and') {
        sequelizeWhere[Op.and] = value.map((condition: Record<string, any>) =>
          this.buildWhereClause(condition),
        );
      } else if (typeof value === 'object' && value !== null) {
        if ('$like' in value) {
          sequelizeWhere[key] = { [Op.like]: value.$like };
        } else if ('$iLike' in value) {
          sequelizeWhere[key] = { [Op.iLike]: value.$iLike };
        } else if ('$ne' in value) {
          sequelizeWhere[key] = { [Op.ne]: value.$ne };
        } else if ('$eq' in value) {
          sequelizeWhere[key] = { [Op.eq]: value.$eq };
        } else if ('$gt' in value) {
          sequelizeWhere[key] = { [Op.gt]: value.$gt };
        } else if ('$gte' in value) {
          sequelizeWhere[key] = { [Op.gte]: value.$gte };
        } else if ('$lt' in value) {
          sequelizeWhere[key] = { [Op.lt]: value.$lt };
        } else if ('$lte' in value) {
          sequelizeWhere[key] = { [Op.lte]: value.$lte };
        } else if ('$in' in value) {
          sequelizeWhere[key] = { [Op.in]: value.$in };
        } else {
          sequelizeWhere[key] = value;
        }
      } else {
        sequelizeWhere[key] = value;
      }
    }
    return sequelizeWhere;
  }

  /**
   * Build Sequelize include options
   */
  private buildIncludeOptions(includes?: any[]): any[] {
    if (!includes) return [];

    return includes.map((inc) => {
      const include: any = {};
      if (inc.model === 'RoomTypes') {
        include.model = RoomTypes;
      }
      if (inc.attributes) {
        include.attributes = inc.attributes;
      }
      if (inc.as) {
        include.as = inc.as;
      }
      if (inc.required !== undefined) {
        include.required = inc.required;
      }
      return include;
    });
  }

  async create(data: CreateHotelData): Promise<HotelEntity> {
    const model = await this.hotelsModel.create(data as any);
    return this.toEntity(model) as HotelEntity;
  }

  async findAll(options?: FindOptions): Promise<HotelEntity[]> {
    const sequelizeOptions: any = {};

    if (options?.where) {
      sequelizeOptions.where = this.buildWhereClause(options.where);
    }
    if (options?.attributes) {
      sequelizeOptions.attributes = options.attributes;
    }
    if (options?.include) {
      sequelizeOptions.include = this.buildIncludeOptions(options.include);
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
    if (options?.raw !== undefined) {
      sequelizeOptions.raw = options.raw;
    }

    const models = await this.hotelsModel.findAll(sequelizeOptions);
    return this.toEntities(models);
  }

  async findAndCountAll(
    options?: FindOptions,
  ): Promise<FindAndCountResult<HotelEntity>> {
    const sequelizeOptions: any = {};

    if (options?.where) {
      sequelizeOptions.where = this.buildWhereClause(options.where);
    }
    if (options?.attributes) {
      sequelizeOptions.attributes = options.attributes;
    }
    if (options?.include) {
      sequelizeOptions.include = this.buildIncludeOptions(options.include);
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

    const result = await this.hotelsModel.findAndCountAll(sequelizeOptions);
    return {
      rows: this.toEntities(result.rows),
      count: result.count,
    };
  }

  async findOne(options: FindOptions): Promise<HotelEntity | null> {
    const sequelizeOptions: any = {};

    if (options?.where) {
      sequelizeOptions.where = this.buildWhereClause(options.where);
    }
    if (options?.attributes) {
      sequelizeOptions.attributes = options.attributes;
    }
    if (options?.include) {
      sequelizeOptions.include = this.buildIncludeOptions(options.include);
    }
    if (options?.raw !== undefined) {
      sequelizeOptions.raw = options.raw;
    }

    const model = await this.hotelsModel.findOne(sequelizeOptions);
    return this.toEntity(model);
  }

  async findByUuid(
    uuid: string,
    options?: FindOptions,
  ): Promise<HotelEntity | null> {
    const sequelizeOptions: any = {
      where: { uuid },
    };

    if (options?.attributes) {
      sequelizeOptions.attributes = options.attributes;
    }
    if (options?.include) {
      sequelizeOptions.include = this.buildIncludeOptions(options.include);
    }
    if (options?.raw !== undefined) {
      sequelizeOptions.raw = options.raw;
    }

    const model = await this.hotelsModel.findOne(sequelizeOptions);
    return this.toEntity(model);
  }

  async update(uuid: string, data: UpdateHotelData): Promise<[number]> {
    return await this.hotelsModel.update(
      {
        ...data,
        updated_at: new Date(),
      },
      { where: { uuid } },
    );
  }

  async delete(uuid: string): Promise<number> {
    return await this.hotelsModel.destroy({ where: { uuid } });
  }

  async count(options?: CountOptions): Promise<number> {
    const sequelizeOptions: any = {};
    if (options?.where) {
      sequelizeOptions.where = this.buildWhereClause(options.where);
    }
    const result = await this.hotelsModel.count(sequelizeOptions);
    // Handle both number and GroupedCountResultItem[] return types
    return typeof result === 'number' ? result : (result as any[]).length;
  }

  async exists(uuid: string): Promise<boolean> {
    const count = await this.hotelsModel.count({ where: { uuid } });
    return count > 0;
  }

  // ============================================
  // HOTEL-SPECIFIC METHODS
  // ============================================

  async findBySlug(slug: string): Promise<HotelEntity | null> {
    const model = await this.hotelsModel.findOne({
      where: { slug },
    });
    return this.toEntity(model);
  }

  async isSlugExists(slug: string, excludeUuid?: string): Promise<boolean> {
    const where: any = { slug };
    if (excludeUuid) {
      where.uuid = { [Op.ne]: excludeUuid };
    }
    const count = await this.hotelsModel.count({ where });
    return count > 0;
  }

  async findAllWithFilters(
    query: HotelQueryParams,
  ): Promise<{ rows: HotelEntity[]; count: number }> {
    const {
      page = 1,
      limit = 10,
      search,
      country,
      city,
      star_rating,
      is_active,
      sort_by = 'created_at',
      sort_order = 'DESC',
      filterAdminId,
      fullAccessAdminIds = [],
    } = query;

    const offset = (page - 1) * limit;
    const where: any = {};

    // Build AND conditions array for complex filtering
    const andConditions: any[] = [];

    // Data-level filtering: Show shared (Super Admin/Developer) + own + legacy data
    // If filterAdminId is null/undefined = full access (no filtering)
    // If filterAdminId is set = show: legacy (null) + shared (fullAccessAdminIds) + own (filterAdminId)
    if (filterAdminId !== null && filterAdminId !== undefined) {
      const createdByConditions: any[] = [
        { created_by: null }, // Legacy data without creator
        { created_by: filterAdminId }, // Own data
      ];

      // Add shared data from Super Admin/Developer
      if (fullAccessAdminIds.length > 0) {
        createdByConditions.push({ created_by: { [Op.in]: fullAccessAdminIds } });
      }

      andConditions.push({ [Op.or]: createdByConditions });
    }

    // Search filter (use iLike for PostgreSQL case-insensitive search)
    if (search) {
      andConditions.push({
        [Op.or]: [
          { name: { [Op.iLike]: `%${search}%` } },
          { address: { [Op.iLike]: `%${search}%` } },
          { city: { [Op.iLike]: `%${search}%` } },
          { country: { [Op.iLike]: `%${search}%` } },
        ],
      });
    }

    // Apply AND conditions if any exist
    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
    }

    // Country filter
    if (country) {
      where.country = { [Op.iLike]: `%${country}%` };
    }

    // City filter
    if (city) {
      where.city = { [Op.iLike]: `%${city}%` };
    }

    // Star rating filter
    if (star_rating) {
      where.star_rating = star_rating;
    }

    // Active status filter
    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    const result = await this.hotelsModel.findAndCountAll({
      where,
      attributes: [
        'id',
        'uuid',
        'name',
        'slug',
        'description',
        'address',
        'city',
        'state',
        'country',
        'postal_code',
        'phone',
        'email',
        'website',
        'star_rating',
        'check_in_time',
        'check_out_time',
        'latitude',
        'longitude',
        'image_url',
        'amenities',
        'gallery_images',
        'is_active',
        'created_by',
        'created_at',
        'updated_at',
      ],
      include: [
        {
          model: RoomTypes,
          as: 'room_types',
          attributes: [
            'uuid',
            'name',
            'slug',
            'description',
            'bed_type',
            'room_size',
            'max_adults',
            'max_children',
            'max_occupancy',
            'base_price',
            'amenities',
            'image_url',
            'gallery_images',
            'sort_order',
            'is_active',
          ],
          required: false,
        },
        {
          model: WeddingGroups,
          as: 'wedding_groups',
          attributes: ['id'],
          required: false,
        },
      ],
      order: [[sort_by, sort_order]],
      offset,
      limit,
      distinct: true,
    });

    // Handle count which can be number or array when using includes
    let count: number;
    if (typeof result.count === 'number') {
      count = result.count;
    } else if (Array.isArray(result.count)) {
      count = (result.count as any[]).length;
    } else {
      count = 0;
    }

    // Map rows to entities with hasWeddingGroups flag
    const rows = result.rows.map((model) => {
      const entity = this.toEntity(model) as HotelEntity;
      const plain = model.get({ plain: true }) as any;
      entity.hasWeddingGroups = plain.wedding_groups && plain.wedding_groups.length > 0;
      // Remove wedding_groups from response (only need the flag)
      delete (entity as any).wedding_groups;
      return entity;
    });

    return {
      rows,
      count,
    };
  }

  async search(searchQuery: string, limit: number = 10): Promise<HotelEntity[]> {
    const models = await this.hotelsModel.findAll({
      where: {
        is_active: true,
        [Op.or]: [
          { name: { [Op.iLike]: `%${searchQuery}%` } },
          { city: { [Op.iLike]: `%${searchQuery}%` } },
          { country: { [Op.iLike]: `%${searchQuery}%` } },
        ],
      },
      attributes: [
        'uuid',
        'name',
        'slug',
        'city',
        'country',
        'star_rating',
        'image_url',
      ],
      limit,
    });

    return this.toEntities(models);
  }

  async changeStatus(uuid: string, is_active: boolean): Promise<[number]> {
    return await this.hotelsModel.update(
      { is_active, updated_at: new Date() },
      { where: { uuid } },
    );
  }

  async findByUuidWithRoomTypes(uuid: string): Promise<HotelEntity | null> {
    const model = await this.hotelsModel.findOne({
      where: { uuid },
      include: [
        {
          model: RoomTypes,
          as: 'room_types',
          attributes: [
            'uuid',
            'name',
            'slug',
            'description',
            'bed_type',
            'room_size',
            'max_adults',
            'max_children',
            'max_occupancy',
            'base_price',
            'amenities',
            'image_url',
            'gallery_images',
            'sort_order',
            'is_active',
            'created_at',
          ],
          required: false,
        },
      ],
    });

    return this.toEntity(model);
  }

  async findBySlugWithRoomTypes(slug: string): Promise<HotelEntity | null> {
    const model = await this.hotelsModel.findOne({
      where: { slug },
      include: [
        {
          model: RoomTypes,
          as: 'room_types',
          attributes: [
            'uuid',
            'name',
            'slug',
            'description',
            'bed_type',
            'room_size',
            'max_adults',
            'max_children',
            'max_occupancy',
            'base_price',
            'amenities',
            'image_url',
            'sort_order',
            'is_active',
          ],
          required: false,
        },
      ],
    });

    return this.toEntity(model);
  }
}
