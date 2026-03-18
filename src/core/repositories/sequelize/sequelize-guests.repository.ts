/**
 * ============================================
 * SEQUELIZE GUESTS REPOSITORY IMPLEMENTATION
 * ============================================
 *
 * Implements IGuestsRepository using Sequelize ORM.
 * This is the current production implementation.
 *
 * All Sequelize-specific code is contained here.
 * Services never see Sequelize - they only use the interface.
 */

import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { Guests } from '../../../models/Guests';
import { WeddingGroups } from '../../../models/WeddingGroups';
import { Bookings } from '../../../models/Bookings';
import { Hotels } from '../../../models/Hotels';
import {
  FindOptions,
  CountOptions,
  FindAndCountResult,
} from '../base.repository.interface';
import {
  IGuestsRepository,
  GuestEntity,
  CreateGuestData,
  UpdateGuestData,
  GuestQueryParams,
  GuestStats,
} from '../guests.repository.interface';

@Injectable()
export class SequelizeGuestsRepository implements IGuestsRepository {
  constructor(
    private guestsModel: typeof Guests,
  ) {}

  /**
   * Convert Sequelize model to entity
   */
  private toEntity(model: Guests | Record<string, any> | null): GuestEntity | null {
    if (!model) return null;
    if (typeof model.get === 'function') {
      const plain = model.get({ plain: true });
      return plain as GuestEntity;
    }
    return model as GuestEntity;
  }

  /**
   * Convert array of Sequelize models to entities
   */
  private toEntities(models: Guests[]): GuestEntity[] {
    return models.map((m) => this.toEntity(m) as GuestEntity);
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

  async create(data: CreateGuestData): Promise<GuestEntity> {
    const model = await this.guestsModel.create(data as any);
    return this.toEntity(model) as GuestEntity;
  }

  async findAll(options?: FindOptions): Promise<GuestEntity[]> {
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

    const models = await this.guestsModel.findAll(sequelizeOptions);
    return this.toEntities(models);
  }

  async findAndCountAll(
    options?: FindOptions,
  ): Promise<FindAndCountResult<GuestEntity>> {
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

    const result = await this.guestsModel.findAndCountAll(sequelizeOptions);
    return {
      rows: this.toEntities(result.rows),
      count: result.count,
    };
  }

  async findOne(options: FindOptions): Promise<GuestEntity | null> {
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

    const model = await this.guestsModel.findOne(sequelizeOptions);
    return this.toEntity(model);
  }

  async findByUuid(
    uuid: string,
    options?: FindOptions,
  ): Promise<GuestEntity | null> {
    const sequelizeOptions: any = {
      where: { uuid },
    };

    if (options?.attributes) {
      sequelizeOptions.attributes = options.attributes;
    }
    if (options?.raw !== undefined) {
      sequelizeOptions.raw = options.raw;
    }

    const model = await this.guestsModel.findOne(sequelizeOptions);
    return this.toEntity(model);
  }

  async update(uuid: string, data: UpdateGuestData): Promise<[number]> {
    return await this.guestsModel.update(data as any, { where: { uuid } });
  }

  async delete(uuid: string): Promise<number> {
    return await this.guestsModel.destroy({ where: { uuid } });
  }

  async count(options?: CountOptions): Promise<number> {
    const sequelizeOptions: any = {};
    if (options?.where) {
      sequelizeOptions.where = this.buildWhereClause(options.where);
    }
    const result = await this.guestsModel.count(sequelizeOptions);
    return typeof result === 'number' ? result : (result as any[]).length;
  }

  async exists(uuid: string): Promise<boolean> {
    const count = await this.guestsModel.count({ where: { uuid } });
    return count > 0;
  }

  // ============================================
  // GUEST-SPECIFIC METHODS
  // ============================================

  async findByEmailInGroup(
    email: string,
    weddingGroupId: number,
  ): Promise<GuestEntity | null> {
    const model = await this.guestsModel.findOne({
      where: {
        wedding_group_id: weddingGroupId,
        email: { [Op.iLike]: email },
      },
    });
    return this.toEntity(model);
  }

  async isEmailExistsInGroup(
    email: string,
    weddingGroupId: number,
    excludeGuestId?: number,
  ): Promise<boolean> {
    const where: any = {
      wedding_group_id: weddingGroupId,
      email: { [Op.iLike]: email },
    };
    if (excludeGuestId) {
      where.id = { [Op.ne]: excludeGuestId };
    }
    const count = await this.guestsModel.count({ where });
    return count > 0;
  }

  async findAllWithFilters(
    query: GuestQueryParams,
    filterAdminId?: number | null,
  ): Promise<{ rows: GuestEntity[]; count: number }> {
    const {
      page = 1,
      limit = 25,
      search,
      wedding_group_uuid,
      status,
      relationship,
      side,
      invitation_sent,
      sort_by = 'created_at',
      sort_order = 'DESC',
    } = query;

    const offset = (page - 1) * limit;
    const where: any = {};
    const weddingGroupWhere: any = {};

    // Data-level filtering: Filter by wedding group owner
    if (filterAdminId !== null && filterAdminId !== undefined) {
      weddingGroupWhere.created_by = filterAdminId;
    }

    // Filter by wedding group
    if (wedding_group_uuid) {
      const group = await WeddingGroups.findOne({
        where: { uuid: wedding_group_uuid },
        attributes: ['id'],
      });
      if (group) {
        where.wedding_group_id = group.id;
      }
    }

    // Search by name or email
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by relationship
    if (relationship) {
      where.relationship = relationship;
    }

    // Filter by side
    if (side) {
      where.side = side;
    }

    // Filter by invitation sent
    if (typeof invitation_sent === 'boolean') {
      where.invitation_sent = invitation_sent;
    }

    const result = await this.guestsModel.findAndCountAll({
      where,
      include: [
        {
          model: WeddingGroups,
          attributes: ['uuid', 'name', 'booking_link', 'event_start_date', 'event_end_date', 'created_by'],
          where: Object.keys(weddingGroupWhere).length > 0 ? weddingGroupWhere : undefined,
        },
        {
          model: Bookings,
          attributes: ['uuid', 'booking_reference', 'status', 'total_amount'],
          required: false,
        },
      ],
      order: [[sort_by, sort_order]],
      limit,
      offset,
    });

    return {
      rows: this.toEntities(result.rows),
      count: result.count,
    };
  }

  async findByUuidWithWeddingGroup(uuid: string): Promise<GuestEntity | null> {
    const model = await this.guestsModel.findOne({
      where: { uuid },
      include: [{ model: WeddingGroups, attributes: ['id'] }],
    });
    return this.toEntity(model);
  }

  async findByUuidWithDetails(uuid: string): Promise<GuestEntity | null> {
    const model = await this.guestsModel.findOne({
      where: { uuid },
      include: [
        {
          model: WeddingGroups,
          attributes: ['uuid', 'name', 'booking_link', 'event_start_date', 'event_end_date', 'status', 'created_by'],
        },
        {
          model: Bookings,
          attributes: [
            'uuid',
            'booking_reference',
            'check_in_date',
            'check_out_date',
            'total_rooms',
            'total_adults',
            'total_children',
            'total_amount',
            'currency',
            'status',
            'created_at',
          ],
        },
      ],
    });
    return this.toEntity(model);
  }

  async findByUuidForInvitation(uuid: string): Promise<GuestEntity | null> {
    const model = await this.guestsModel.findOne({
      where: { uuid },
      include: [
        {
          model: WeddingGroups,
          attributes: [
            'uuid',
            'name',
            'booking_link',
            'event_start_date',
            'event_end_date',
            'status',
            'welcome_message',
            'bride_name',
            'groom_name',
            'hotel_id',
          ],
          include: [
            {
              model: Hotels,
              attributes: ['name', 'city', 'country'],
            },
          ],
        },
      ],
    });
    return this.toEntity(model);
  }

  async getWeddingGroupIdByUuid(uuid: string): Promise<number | null> {
    const group = await WeddingGroups.findOne({
      where: { uuid },
      attributes: ['id'],
    });
    return group ? group.id : null;
  }

  async getWeddingGroupByUuid(uuid: string): Promise<{ id: number; created_by: number | null } | null> {
    const group = await WeddingGroups.findOne({
      where: { uuid },
      attributes: ['id', 'created_by'],
    });
    return group ? { id: group.id, created_by: group.created_by } : null;
  }

  async getStatsByWeddingGroup(weddingGroupId: number): Promise<GuestStats> {
    const stats = await this.guestsModel.findAll({
      where: { wedding_group_id: weddingGroupId },
      attributes: [
        'status',
        [Guests.sequelize.fn('COUNT', Guests.sequelize.col('id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    const totalGuests = await this.guestsModel.count({
      where: { wedding_group_id: weddingGroupId },
    });

    const invitedCount = await this.guestsModel.count({
      where: { wedding_group_id: weddingGroupId, invitation_sent: true },
    });

    const statusCounts = stats.reduce(
      (acc, s: any) => {
        acc[s.status] = parseInt(s.count, 10);
        return acc;
      },
      { pending: 0, invited: 0, booked: 0, declined: 0 },
    );

    return {
      total: totalGuests,
      invited: invitedCount,
      by_status: statusCounts,
      response_rate:
        invitedCount > 0
          ? Math.round(((statusCounts.booked + statusCounts.declined) / invitedCount) * 100)
          : 0,
      booking_rate:
        invitedCount > 0
          ? Math.round((statusCounts.booked / invitedCount) * 100)
          : 0,
    };
  }

  async updateInstance(guest: GuestEntity, data: UpdateGuestData): Promise<GuestEntity> {
    // For Sequelize, we need to reload the model and update it
    const model = await this.guestsModel.findOne({ where: { uuid: guest.uuid } });
    if (!model) {
      throw new Error('Guest not found');
    }
    await model.update(data as any);
    return this.toEntity(model) as GuestEntity;
  }
}
