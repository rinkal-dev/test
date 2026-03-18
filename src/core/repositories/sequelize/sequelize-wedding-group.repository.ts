/**
 * ============================================
 * SEQUELIZE WEDDING GROUP REPOSITORY
 * ============================================
 *
 * Sequelize-specific implementation of IWeddingGroupRepository.
 * This repository handles all database operations for wedding groups
 * using Sequelize ORM.
 */

import { Op, literal, fn, col } from 'sequelize';
import { WeddingGroups } from '../../../models/WeddingGroups';
import { Hotels } from '../../../models/Hotels';
import { Admins } from '../../../models/Admins';
import { GroupRoomBlocks } from '../../../models/GroupRoomBlocks';
import { GroupAddons } from '../../../models/GroupAddons';
import { Guests } from '../../../models/Guests';
import { Bookings } from '../../../models/Bookings';
import { RoomTypes } from '../../../models/RoomTypes';
import {
  FindOptions,
  CountOptions,
  FindAndCountResult,
} from '../base.repository.interface';
import {
  IWeddingGroupRepository,
  WeddingGroupEntity,
  CreateWeddingGroupData,
  UpdateWeddingGroupData,
  WeddingGroupQueryParams,
} from '../wedding-group.repository.interface';

export class SequelizeWeddingGroupRepository implements IWeddingGroupRepository {
  constructor(private readonly weddingGroupModel: typeof WeddingGroups) {}

  /**
   * Convert Sequelize model to entity
   */
  private toEntity(model: WeddingGroups | Record<string, any> | null): WeddingGroupEntity | null {
    if (!model) return null;

    // Handle both model instances and raw objects
    if (typeof model.get === 'function') {
      const plain = model.get({ plain: true });
      return plain as WeddingGroupEntity;
    }

    return model as WeddingGroupEntity;
  }

  /**
   * Convert array of models to entities
   */
  private toEntities(models: WeddingGroups[]): WeddingGroupEntity[] {
    return models.map((m) => this.toEntity(m) as WeddingGroupEntity);
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

  // ============================================
  // BASE REPOSITORY METHODS
  // ============================================

  /**
   * Create a new wedding group
   */
  async create(data: CreateWeddingGroupData): Promise<WeddingGroupEntity> {
    const weddingGroup = await this.weddingGroupModel.create(data as any);
    return this.toEntity(weddingGroup)!;
  }

  /**
   * Find all wedding groups
   */
  async findAll(options?: FindOptions): Promise<WeddingGroupEntity[]> {
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
    if (options?.raw !== undefined) {
      sequelizeOptions.raw = options.raw;
    }

    const weddingGroups = await this.weddingGroupModel.findAll(sequelizeOptions);
    return this.toEntities(weddingGroups);
  }

  /**
   * Find all with count (for pagination)
   */
  async findAndCountAll(options?: FindOptions): Promise<FindAndCountResult<WeddingGroupEntity>> {
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

    const result = await this.weddingGroupModel.findAndCountAll(sequelizeOptions);
    return {
      rows: this.toEntities(result.rows),
      count: typeof result.count === 'number' ? result.count : (result.count as any[]).length,
    };
  }

  /**
   * Find one by conditions
   */
  async findOne(options: FindOptions): Promise<WeddingGroupEntity | null> {
    const sequelizeOptions: any = {};

    if (options?.where) {
      sequelizeOptions.where = this.buildWhereClause(options.where);
    }
    if (options?.attributes) {
      sequelizeOptions.attributes = options.attributes;
    }
    if (options?.raw !== undefined) {
      sequelizeOptions.raw = options.raw;
    }

    const weddingGroup = await this.weddingGroupModel.findOne(sequelizeOptions);
    return this.toEntity(weddingGroup);
  }

  /**
   * Find wedding group by UUID
   */
  async findByUuid(uuid: string, options?: FindOptions): Promise<WeddingGroupEntity | null> {
    const sequelizeOptions: any = {
      where: { uuid },
    };

    if (options?.attributes) {
      sequelizeOptions.attributes = options.attributes;
    }
    if (options?.raw !== undefined) {
      sequelizeOptions.raw = options.raw;
    }

    const weddingGroup = await this.weddingGroupModel.findOne(sequelizeOptions);
    return this.toEntity(weddingGroup);
  }

  /**
   * Find wedding group by ID
   */
  async findById(id: number, options?: FindOptions): Promise<WeddingGroupEntity | null> {
    const sequelizeOptions: any = {};

    if (options?.attributes) {
      sequelizeOptions.attributes = options.attributes;
    }
    if (options?.raw !== undefined) {
      sequelizeOptions.raw = options.raw;
    }

    const weddingGroup = await this.weddingGroupModel.findByPk(id, sequelizeOptions);
    return this.toEntity(weddingGroup);
  }

  /**
   * Update wedding group by UUID
   */
  async update(uuid: string, data: UpdateWeddingGroupData): Promise<[number]> {
    return await this.weddingGroupModel.update(
      {
        ...data,
        updated_at: new Date(),
      },
      { where: { uuid } },
    );
  }

  /**
   * Delete wedding group by UUID
   */
  async delete(uuid: string): Promise<number> {
    return await this.weddingGroupModel.destroy({
      where: { uuid },
    });
  }

  /**
   * Count wedding groups
   */
  async count(options?: CountOptions): Promise<number> {
    const sequelizeOptions: any = {};
    if (options?.where) {
      sequelizeOptions.where = this.buildWhereClause(options.where);
    }
    const result = await this.weddingGroupModel.count(sequelizeOptions);
    return typeof result === 'number' ? result : (result as any[]).length;
  }

  /**
   * Check if wedding group exists
   */
  async exists(uuid: string): Promise<boolean> {
    const count = await this.weddingGroupModel.count({ where: { uuid } });
    return count > 0;
  }

  // ============================================
  // WEDDING GROUP-SPECIFIC METHODS
  // ============================================

  /**
   * Find wedding group by booking link
   */
  async findByBookingLink(bookingLink: string): Promise<WeddingGroupEntity | null> {
    const weddingGroup = await this.weddingGroupModel.findOne({
      where: { booking_link: bookingLink },
    });
    return this.toEntity(weddingGroup);
  }

  /**
   * Check if booking link exists
   */
  async isBookingLinkExists(bookingLink: string, excludeUuid?: string): Promise<boolean> {
    const whereClause: any = { booking_link: bookingLink };
    if (excludeUuid) {
      whereClause.uuid = { [Op.ne]: excludeUuid };
    }
    const count = await this.weddingGroupModel.count({ where: whereClause });
    return count > 0;
  }

  /**
   * Get all wedding groups with pagination and filters
   */
  async findAllWithFilters(
    query: WeddingGroupQueryParams,
  ): Promise<{ rows: WeddingGroupEntity[]; count: number }> {
    const {
      page = 1,
      limit = 10,
      search,
      hotel_id,
      status,
      created_by,
      event_date_from,
      event_date_to,
      sort_by = 'created_at',
      sort_order = 'DESC',
    } = query;

    const offset = (page - 1) * limit;
    const whereClause: any = {};

    // Search filter (name, bride_name, groom_name, hotel name)
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { bride_name: { [Op.iLike]: `%${search}%` } },
        { groom_name: { [Op.iLike]: `%${search}%` } },
        { booking_link: { [Op.iLike]: `%${search}%` } },
        { '$hotel.name$': { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Hotel filter
    if (hotel_id) {
      whereClause.hotel_id = hotel_id;
    }

    // Status filter
    if (status) {
      whereClause.status = status;
    }

    // Created by filter
    if (created_by) {
      whereClause.created_by = created_by;
    }

    // Event date range filter
    if (event_date_from || event_date_to) {
      whereClause.event_start_date = {};
      if (event_date_from) {
        whereClause.event_start_date[Op.gte] = event_date_from;
      }
      if (event_date_to) {
        whereClause.event_start_date[Op.lte] = event_date_to;
      }
    }

    // Validate sort_by to prevent SQL injection
    const allowedSortFields = [
      'name',
      'event_start_date',
      'event_end_date',
      'booking_window_start',
      'booking_window_end',
      'status',
      'created_at',
      'updated_at',
    ];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';

    const { rows, count } = await this.weddingGroupModel.findAndCountAll({
      where: whereClause,
      attributes: {
        include: [
          // Bookings count subquery
          [
            literal(`(
              SELECT COUNT(*)
              FROM bookings
              WHERE bookings.wedding_group_id = "wedding_groups".id
              AND bookings.status != 'cancelled'
            )`),
            'bookings_count',
          ],
          // Total revenue subquery (sum of total_amount from non-cancelled bookings)
          [
            literal(`(
              SELECT COALESCE(SUM(total_amount), 0)
              FROM bookings
              WHERE bookings.wedding_group_id = "wedding_groups".id
              AND bookings.status != 'cancelled'
            )`),
            'total_revenue',
          ],
        ],
      },
      include: [
        {
          model: Hotels,
          as: 'hotel',
          attributes: ['id', 'uuid', 'name', 'slug', 'city', 'country', 'image_url'],
        },
        {
          model: Admins,
          as: 'created_by_admin',
          attributes: ['id', 'uuid', 'name', 'email'],
        },
      ],
      order: [[sortField, sort_order]],
      limit,
      offset,
      distinct: true,
    });

    return {
      rows: this.toEntities(rows),
      count: typeof count === 'number' ? count : (count as any[]).length,
    };
  }

  /**
   * Change wedding group status
   */
  async changeStatus(
    uuid: string,
    status: 'draft' | 'active' | 'completed' | 'cancelled',
  ): Promise<[number]> {
    return await this.weddingGroupModel.update(
      { status, updated_at: new Date() },
      { where: { uuid } },
    );
  }

  /**
   * Get wedding group with all relations
   */
  async findByUuidWithRelations(uuid: string): Promise<WeddingGroupEntity | null> {
    const weddingGroup = await this.weddingGroupModel.findOne({
      where: { uuid },
      include: [
        {
          model: Hotels,
          as: 'hotel',
          attributes: ['id', 'uuid', 'name', 'slug', 'description', 'address', 'city', 'country', 'phone', 'email', 'website', 'star_rating', 'check_in_time', 'check_out_time', 'image_url', 'amenities', 'gallery_images', 'is_active'],
          include: [
            {
              model: RoomTypes,
              as: 'room_types',
              attributes: ['id', 'uuid', 'name', 'slug', 'description', 'bed_type', 'room_size', 'max_adults', 'max_children', 'max_occupancy', 'base_price', 'amenities', 'image_url', 'gallery_images', 'sort_order', 'is_active'],
            },
          ],
        },
        {
          model: Admins,
          as: 'created_by_admin',
          attributes: ['id', 'uuid', 'name', 'email'],
        },
        {
          model: GroupRoomBlocks,
          as: 'group_room_blocks',
          include: [
            {
              model: RoomTypes,
              as: 'room_type',
              attributes: ['id', 'uuid', 'name', 'slug', 'description', 'bed_type', 'image_url', 'max_occupancy'],
            },
          ],
        },
        {
          model: GroupAddons,
          as: 'group_addons',
        },
      ],
    });
    return this.toEntity(weddingGroup);
  }

  /**
   * Get wedding group by booking link with relations (for public booking page)
   */
  async findByBookingLinkWithRelations(bookingLink: string): Promise<WeddingGroupEntity | null> {
    const weddingGroup = await this.weddingGroupModel.findOne({
      where: {
        booking_link: bookingLink,
        status: 'active', // Only return active groups for public access
      },
      include: [
        {
          model: Hotels,
          as: 'hotel',
          attributes: ['id', 'uuid', 'name', 'slug', 'description', 'address', 'city', 'country', 'phone', 'email', 'website', 'star_rating', 'check_in_time', 'check_out_time', 'image_url', 'amenities', 'gallery_images'],
          where: { is_active: true },
          include: [
            {
              model: RoomTypes,
              as: 'room_types',
              attributes: ['id', 'uuid', 'name', 'slug', 'description', 'bed_type', 'room_size', 'max_adults', 'max_children', 'max_occupancy', 'base_price', 'amenities', 'image_url', 'gallery_images'],
              where: { is_active: true },
              required: false,
            },
          ],
        },
        {
          model: GroupRoomBlocks,
          as: 'group_room_blocks',
          where: { is_active: true },
          required: false,
          include: [
            {
              model: RoomTypes,
              as: 'room_type',
              attributes: ['id', 'uuid', 'name', 'slug', 'description', 'bed_type', 'image_url', 'max_occupancy', 'amenities'],
            },
          ],
        },
        {
          model: GroupAddons,
          as: 'group_addons',
          where: { is_active: true },
          required: false,
        },
      ],
    });
    return this.toEntity(weddingGroup);
  }

  /**
   * Mark invitations as sent
   */
  async markInvitationsSent(uuid: string): Promise<[number]> {
    return await this.weddingGroupModel.update(
      { invitations_sent_at: new Date(), updated_at: new Date() },
      { where: { uuid } },
    );
  }

  /**
   * Get wedding groups by hotel ID
   * @param hotelId - The hotel ID to filter by
   * @param filterAdminId - Optional admin ID for data-level filtering (null = no filter)
   */
  async findByHotelId(hotelId: number, filterAdminId?: number | null): Promise<WeddingGroupEntity[]> {
    const whereClause: any = { hotel_id: hotelId };

    // Apply admin filter if provided
    if (filterAdminId !== null && filterAdminId !== undefined) {
      whereClause.created_by = filterAdminId;
    }

    const weddingGroups = await this.weddingGroupModel.findAll({
      where: whereClause,
      order: [['event_start_date', 'ASC']],
    });
    return this.toEntities(weddingGroups);
  }

  /**
   * Get count of active wedding groups
   * @param filterAdminId - Optional admin ID for data-level filtering (null = no filter)
   */
  async getActiveCount(filterAdminId?: number | null): Promise<number> {
    const whereClause: any = { status: 'active' };

    // Apply admin filter if provided
    if (filterAdminId !== null && filterAdminId !== undefined) {
      whereClause.created_by = filterAdminId;
    }

    const result = await this.weddingGroupModel.count({
      where: whereClause,
    });
    return typeof result === 'number' ? result : (result as any[]).length;
  }

  /**
   * Generate unique booking link
   */
  async generateUniqueBookingLink(baseName: string): Promise<string> {
    // Create slug from base name
    let baseLink = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check if link exists
    let link = baseLink;
    let counter = 1;

    while (await this.isBookingLinkExists(link)) {
      link = `${baseLink}-${counter}`;
      counter++;
    }

    return link;
  }
}
