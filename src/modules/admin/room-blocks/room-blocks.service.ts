/**
 * ============================================
 * ROOM BLOCKS SERVICE
 * ============================================
 *
 * Service for managing room blocks within wedding groups.
 * Room blocks allocate rooms from hotel room types to wedding groups
 * with custom pricing.
 */

import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { GroupRoomBlocks } from 'src/models/GroupRoomBlocks';
import { WeddingGroups } from 'src/models/WeddingGroups';
import { RoomTypes } from 'src/models/RoomTypes';
import { Bookings } from 'src/models/Bookings';
import { GROUP_ROOM_BLOCKS_REPOSITORY, WEDDING_GROUPS_REPOSITORY, ROOM_TYPES_REPOSITORY, BOOKINGS_REPOSITORY } from 'src/config/constants';
import { CreateRoomBlockDto } from './dto/CreateRoomBlockDto';
import { UpdateRoomBlockDto } from './dto/UpdateRoomBlockDto';

@Injectable()
export class RoomBlocksService {
  constructor(
    @Inject(GROUP_ROOM_BLOCKS_REPOSITORY) private roomBlocksModel: typeof GroupRoomBlocks,
    @Inject(WEDDING_GROUPS_REPOSITORY) private weddingGroupsModel: typeof WeddingGroups,
    @Inject(ROOM_TYPES_REPOSITORY) private roomTypesModel: typeof RoomTypes,
    @Inject(BOOKINGS_REPOSITORY) private bookingsModel: typeof Bookings,
  ) {}

  /**
   * Check if wedding group has any deposit or final payments
   * Returns true if changes should be blocked
   */
  async hasPaymentProtection(weddingGroupId: number): Promise<{ isProtected: boolean; reason?: string }> {
    const bookings = await this.bookingsModel.findAll({
      where: {
        wedding_group_id: weddingGroupId,
        status: { [Op.notIn]: ['cancelled', 'failed'] },
      },
      attributes: ['id', 'status', 'deposit_paid_at', 'final_paid_at'],
      raw: true,
    });

    const hasAnyFinalPaid = bookings.some((b) => b.final_paid_at !== null);
    const hasAnyDepositPaid = bookings.some(
      (b) => b.deposit_paid_at !== null || b.status === 'deposit_paid' || b.status === 'confirmed' || b.status === 'completed',
    );

    if (hasAnyFinalPaid) {
      return { isProtected: true, reason: 'Final payment has been made for one or more bookings' };
    }
    if (hasAnyDepositPaid) {
      return { isProtected: true, reason: 'Deposit has been paid for one or more bookings' };
    }
    return { isProtected: false };
  }

  /**
   * Get wedding group ID by UUID
   */
  async getWeddingGroupIdByUuid(uuid: string): Promise<number | null> {
    const group = await this.weddingGroupsModel.findOne({
      where: { uuid },
      attributes: ['id'],
      raw: true,
    });
    return group ? group.id : null;
  }

  /**
   * Check if wedding group exists
   */
  async weddingGroupExists(uuid: string): Promise<boolean> {
    const count = await this.weddingGroupsModel.count({ where: { uuid } });
    return count > 0;
  }

  /**
   * Get room type ID by UUID
   */
  async getRoomTypeIdByUuid(roomTypeUuid: string): Promise<number | null> {
    const roomType = await this.roomTypesModel.findOne({
      where: { uuid: roomTypeUuid },
      attributes: ['id'],
      raw: true,
    });
    return roomType ? roomType.id : null;
  }

  /**
   * Create a room block
   */
  async create(weddingGroupId: number, dto: CreateRoomBlockDto): Promise<GroupRoomBlocks> {
    // Look up room type ID from UUID
    const roomTypeId = await this.getRoomTypeIdByUuid(dto.room_type_uuid);
    if (!roomTypeId) {
      throw new NotFoundException(`Room type with UUID ${dto.room_type_uuid} not found`);
    }

    const { room_type_uuid, ...restDto } = dto;
    return await this.roomBlocksModel.create({
      uuid: uuidv4(),
      wedding_group_id: weddingGroupId,
      room_type_id: roomTypeId,
      ...restDto,
      rooms_booked: 0,
    } as any);
  }

  /**
   * Find all room blocks for a wedding group
   */
  async findAllByWeddingGroupId(weddingGroupId: number): Promise<GroupRoomBlocks[]> {
    return await this.roomBlocksModel.findAll({
      where: { wedding_group_id: weddingGroupId },
      include: [
        {
          model: RoomTypes,
          as: 'room_type',
          attributes: ['id', 'uuid', 'name', 'slug', 'description', 'bed_type', 'image_url', 'max_occupancy', 'base_price', 'amenities'],
        },
      ],
      order: [['created_at', 'ASC']],
    });
  }

  /**
   * Find room block by UUID
   */
  async findByUuid(uuid: string): Promise<GroupRoomBlocks | null> {
    return await this.roomBlocksModel.findOne({
      where: { uuid },
      include: [
        {
          model: RoomTypes,
          as: 'room_type',
          attributes: ['id', 'uuid', 'name', 'slug', 'description', 'bed_type', 'image_url', 'max_occupancy', 'base_price', 'amenities'],
        },
      ],
    });
  }

  /**
   * Check if room block exists
   */
  async isExist(uuid: string): Promise<GroupRoomBlocks | null> {
    return await this.roomBlocksModel.findOne({
      where: { uuid },
      attributes: ['id', 'uuid', 'rooms_allocated', 'rooms_booked'],
      raw: true,
    });
  }

  /**
   * Update room block (with protection check)
   */
  async update(uuid: string, dto: UpdateRoomBlockDto, weddingGroupId?: number): Promise<[number]> {
    // Get the wedding group ID if not provided
    if (!weddingGroupId) {
      const block = await this.roomBlocksModel.findOne({
        where: { uuid },
        attributes: ['wedding_group_id'],
        raw: true,
      });
      if (!block) {
        throw new NotFoundException('Room block not found');
      }
      weddingGroupId = block.wedding_group_id;
    }

    // Check payment protection for price changes
    if (dto.price_per_night !== undefined) {
      const protection = await this.hasPaymentProtection(weddingGroupId);
      if (protection.isProtected) {
        throw new BadRequestException(
          `Cannot change room pricing - ${protection.reason}. Pricing is locked after payments are made.`,
        );
      }
    }

    return await this.roomBlocksModel.update(dto as any, {
      where: { uuid },
    });
  }

  /**
   * Delete room block (with protection check)
   */
  async delete(uuid: string): Promise<number> {
    // Get the room block to check wedding group
    const block = await this.roomBlocksModel.findOne({
      where: { uuid },
      attributes: ['wedding_group_id', 'rooms_booked'],
      raw: true,
    });

    if (!block) {
      throw new NotFoundException('Room block not found');
    }

    // Cannot delete if rooms are booked
    if (block.rooms_booked > 0) {
      throw new BadRequestException(
        `Cannot delete room block - ${block.rooms_booked} room(s) are already booked.`,
      );
    }

    // Check payment protection
    const protection = await this.hasPaymentProtection(block.wedding_group_id);
    if (protection.isProtected) {
      throw new BadRequestException(
        `Cannot delete room block - ${protection.reason}. Configuration is locked after payments are made.`,
      );
    }

    return await this.roomBlocksModel.destroy({
      where: { uuid },
    });
  }

  /**
   * Sync room blocks (bulk update/create)
   * Replaces all existing room blocks with new ones
   */
  async syncRoomBlocks(weddingGroupId: number, roomBlocks: CreateRoomBlockDto[]): Promise<GroupRoomBlocks[]> {
    // Check payment protection before syncing
    const protection = await this.hasPaymentProtection(weddingGroupId);
    if (protection.isProtected) {
      throw new BadRequestException(
        `Cannot sync room blocks - ${protection.reason}. Room configuration is locked after payments are made.`,
      );
    }

    // Delete existing room blocks (only if no bookings)
    await this.roomBlocksModel.destroy({
      where: {
        wedding_group_id: weddingGroupId,
        rooms_booked: 0, // Only delete blocks with no bookings
      },
    });

    // Create new room blocks
    const created: GroupRoomBlocks[] = [];
    for (const block of roomBlocks) {
      // Look up room type ID from UUID
      const roomTypeId = await this.getRoomTypeIdByUuid(block.room_type_uuid);
      if (!roomTypeId) {
        console.warn(`Room type with UUID ${block.room_type_uuid} not found, skipping`);
        continue;
      }

      const { room_type_uuid, ...restBlock } = block;
      const roomBlock = await this.roomBlocksModel.create({
        uuid: uuidv4(),
        wedding_group_id: weddingGroupId,
        room_type_id: roomTypeId,
        ...restBlock,
        rooms_booked: 0,
      } as any);
      created.push(roomBlock);
    }

    return created;
  }

  /**
   * Get available rooms count for a room block
   */
  async getAvailableRooms(uuid: string): Promise<number> {
    const block = await this.roomBlocksModel.findOne({
      where: { uuid },
      attributes: ['rooms_allocated', 'rooms_booked'],
      raw: true,
    });
    if (!block) return 0;
    return block.rooms_allocated - block.rooms_booked;
  }

  /**
   * Increment booked rooms count
   */
  async incrementBookedRooms(uuid: string, count: number = 1): Promise<[number]> {
    const block = await this.roomBlocksModel.findOne({ where: { uuid } });
    if (!block) throw new Error('Room block not found');

    const newBooked = block.rooms_booked + count;
    if (newBooked > block.rooms_allocated) {
      throw new Error('Not enough rooms available');
    }

    return await this.roomBlocksModel.update(
      { rooms_booked: newBooked },
      { where: { uuid } },
    );
  }

  /**
   * Decrement booked rooms count (for cancellations)
   */
  async decrementBookedRooms(uuid: string, count: number = 1): Promise<[number]> {
    const block = await this.roomBlocksModel.findOne({ where: { uuid } });
    if (!block) throw new Error('Room block not found');

    const newBooked = Math.max(0, block.rooms_booked - count);
    return await this.roomBlocksModel.update(
      { rooms_booked: newBooked },
      { where: { uuid } },
    );
  }

  /**
   * Toggle room block active status
   */
  async toggleStatus(uuid: string, isActive: boolean): Promise<[number]> {
    return await this.roomBlocksModel.update(
      { is_active: isActive },
      { where: { uuid } },
    );
  }

  /**
   * Check availability for all room blocks in a wedding group
   * Returns blocks that have available rooms
   */
  async checkGroupAvailability(weddingGroupId: number, roomsNeeded: number = 1): Promise<{
    available_blocks: Array<{
      uuid: string;
      room_type: any;
      rooms_available: number;
      price_per_night: number;
      rate_sun_wed: number | null;
      rate_thu_sat: number | null;
      base_occupancy: number;
      extra_adult_per_night: number | null;
      extra_child_per_night: number | null;
      extra_teen_per_night: number | null;
      min_nights: number | null;
      max_nights: number | null;
    }>;
    total_rooms_available: number;
    can_accommodate: boolean;
  }> {
    const blocks = await this.roomBlocksModel.findAll({
      where: {
        wedding_group_id: weddingGroupId,
        is_active: true,
      },
      include: [
        {
          model: RoomTypes,
          as: 'room_type',
          attributes: ['uuid', 'name', 'slug', 'description', 'bed_type', 'image_url', 'max_occupancy', 'max_adults', 'max_children', 'base_price', 'amenities'],
        },
      ],
      order: [['price_per_night', 'ASC']],
    });

    const availableBlocks = blocks
      .filter(block => block.rooms_allocated - block.rooms_booked > 0)
      .map(block => ({
        uuid: block.uuid,
        room_type: block.room_type,
        rooms_available: block.rooms_allocated - block.rooms_booked,
        price_per_night: Number(block.price_per_night),
        // Variable pricing fields
        rate_sun_wed: block.rate_sun_wed ? Number(block.rate_sun_wed) : null,
        rate_thu_sat: block.rate_thu_sat ? Number(block.rate_thu_sat) : null,
        base_occupancy: block.base_occupancy || 2,
        extra_adult_per_night: block.extra_adult_per_night ? Number(block.extra_adult_per_night) : null,
        extra_child_per_night: block.extra_child_per_night !== null ? Number(block.extra_child_per_night) : null,
        extra_teen_per_night: block.extra_teen_per_night !== null ? Number(block.extra_teen_per_night) : null,
        min_nights: block.min_nights,
        max_nights: block.max_nights,
      }));

    const totalAvailable = availableBlocks.reduce((sum, block) => sum + block.rooms_available, 0);

    return {
      available_blocks: availableBlocks,
      total_rooms_available: totalAvailable,
      can_accommodate: totalAvailable >= roomsNeeded,
    };
  }

  /**
   * Get full inventory status for a wedding group
   * BE-043: Block Inventory Tracking
   */
  async getInventoryStatus(weddingGroupId: number): Promise<{
    blocks: Array<{
      uuid: string;
      room_type: any;
      rooms_allocated: number;
      rooms_booked: number;
      rooms_available: number;
      occupancy_percentage: number;
      price_per_night: number;
      rate_sun_wed: number | null;
      rate_thu_sat: number | null;
      base_occupancy: number;
      extra_adult_per_night: number | null;
      extra_child_per_night: number | null;
      extra_teen_per_night: number | null;
      is_active: boolean;
      is_sold_out: boolean;
    }>;
    summary: {
      total_rooms_allocated: number;
      total_rooms_booked: number;
      total_rooms_available: number;
      overall_occupancy_percentage: number;
      active_blocks_count: number;
      sold_out_blocks_count: number;
    };
  }> {
    const blocks = await this.roomBlocksModel.findAll({
      where: { wedding_group_id: weddingGroupId },
      include: [
        {
          model: RoomTypes,
          as: 'room_type',
          attributes: ['uuid', 'name', 'slug', 'bed_type', 'image_url', 'max_occupancy'],
        },
      ],
      order: [['created_at', 'ASC']],
    });

    const blockStats = blocks.map(block => {
      const available = block.rooms_allocated - block.rooms_booked;
      const occupancy = block.rooms_allocated > 0
        ? Math.round((block.rooms_booked / block.rooms_allocated) * 100)
        : 0;

      return {
        uuid: block.uuid,
        room_type: block.room_type,
        rooms_allocated: block.rooms_allocated,
        rooms_booked: block.rooms_booked,
        rooms_available: available,
        occupancy_percentage: occupancy,
        price_per_night: Number(block.price_per_night),
        // Variable pricing fields
        rate_sun_wed: block.rate_sun_wed ? Number(block.rate_sun_wed) : null,
        rate_thu_sat: block.rate_thu_sat ? Number(block.rate_thu_sat) : null,
        base_occupancy: block.base_occupancy || 2,
        extra_adult_per_night: block.extra_adult_per_night ? Number(block.extra_adult_per_night) : null,
        extra_child_per_night: block.extra_child_per_night !== null ? Number(block.extra_child_per_night) : null,
        extra_teen_per_night: block.extra_teen_per_night !== null ? Number(block.extra_teen_per_night) : null,
        is_active: block.is_active,
        is_sold_out: available <= 0,
      };
    });

    const totalAllocated = blockStats.reduce((sum, b) => sum + b.rooms_allocated, 0);
    const totalBooked = blockStats.reduce((sum, b) => sum + b.rooms_booked, 0);
    const totalAvailable = blockStats.reduce((sum, b) => sum + b.rooms_available, 0);
    const activeBlocks = blockStats.filter(b => b.is_active).length;
    const soldOutBlocks = blockStats.filter(b => b.is_sold_out && b.is_active).length;

    return {
      blocks: blockStats,
      summary: {
        total_rooms_allocated: totalAllocated,
        total_rooms_booked: totalBooked,
        total_rooms_available: totalAvailable,
        overall_occupancy_percentage: totalAllocated > 0
          ? Math.round((totalBooked / totalAllocated) * 100)
          : 0,
        active_blocks_count: activeBlocks,
        sold_out_blocks_count: soldOutBlocks,
      },
    };
  }

  /**
   * Check if specific number of rooms are available in a block
   */
  async hasAvailability(uuid: string, roomsNeeded: number = 1): Promise<boolean> {
    const available = await this.getAvailableRooms(uuid);
    return available >= roomsNeeded;
  }

  /**
   * Reserve rooms temporarily (for booking process)
   * Returns true if reservation successful, false if not enough rooms
   */
  async reserveRooms(uuid: string, count: number): Promise<boolean> {
    const block = await this.roomBlocksModel.findOne({ where: { uuid } });
    if (!block) return false;

    const available = block.rooms_allocated - block.rooms_booked;
    if (available < count) return false;

    await this.roomBlocksModel.update(
      { rooms_booked: block.rooms_booked + count },
      { where: { uuid } },
    );
    return true;
  }

  /**
   * Release reserved rooms (for failed/cancelled bookings)
   */
  async releaseRooms(uuid: string, count: number): Promise<void> {
    const block = await this.roomBlocksModel.findOne({ where: { uuid } });
    if (!block) return;

    const newBooked = Math.max(0, block.rooms_booked - count);
    await this.roomBlocksModel.update(
      { rooms_booked: newBooked },
      { where: { uuid } },
    );
  }
}
