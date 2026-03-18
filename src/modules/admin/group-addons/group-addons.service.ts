/**
 * ============================================
 * GROUP ADDONS SERVICE
 * ============================================
 *
 * Service for managing addons within wedding groups.
 * Addons are extra services like breakfast, airport transfer, etc.
 */

import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { GroupAddons } from 'src/models/GroupAddons';
import { WeddingGroups } from 'src/models/WeddingGroups';
import { Bookings } from 'src/models/Bookings';
import { GROUP_ADDONS_REPOSITORY, WEDDING_GROUPS_REPOSITORY, BOOKINGS_REPOSITORY } from 'src/config/constants';
import { CreateGroupAddonDto } from './dto/CreateGroupAddonDto';
import { UpdateGroupAddonDto } from './dto/UpdateGroupAddonDto';

@Injectable()
export class GroupAddonsService {
  constructor(
    @Inject(GROUP_ADDONS_REPOSITORY) private addonsModel: typeof GroupAddons,
    @Inject(WEDDING_GROUPS_REPOSITORY) private weddingGroupsModel: typeof WeddingGroups,
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
   * Create an addon
   */
  async create(weddingGroupId: number, dto: CreateGroupAddonDto): Promise<GroupAddons> {
    return await this.addonsModel.create({
      uuid: uuidv4(),
      wedding_group_id: weddingGroupId,
      ...dto,
    } as any);
  }

  /**
   * Find all addons for a wedding group
   */
  async findAllByWeddingGroupId(weddingGroupId: number): Promise<GroupAddons[]> {
    return await this.addonsModel.findAll({
      where: { wedding_group_id: weddingGroupId },
      order: [['addon_type', 'ASC'], ['created_at', 'ASC']],
    });
  }

  /**
   * Find addon by UUID
   */
  async findByUuid(uuid: string): Promise<GroupAddons | null> {
    return await this.addonsModel.findOne({
      where: { uuid },
    });
  }

  /**
   * Check if addon exists
   */
  async isExist(uuid: string): Promise<GroupAddons | null> {
    return await this.addonsModel.findOne({
      where: { uuid },
      attributes: ['id', 'uuid'],
      raw: true,
    });
  }

  /**
   * Update addon (with protection check)
   */
  async update(uuid: string, dto: UpdateGroupAddonDto, weddingGroupId?: number): Promise<[number]> {
    // Get the wedding group ID if not provided
    if (!weddingGroupId) {
      const addon = await this.addonsModel.findOne({
        where: { uuid },
        attributes: ['wedding_group_id'],
        raw: true,
      });
      if (!addon) {
        throw new NotFoundException('Addon not found');
      }
      weddingGroupId = addon.wedding_group_id;
    }

    // Check payment protection for price changes
    if (dto.price !== undefined) {
      const protection = await this.hasPaymentProtection(weddingGroupId);
      if (protection.isProtected) {
        throw new BadRequestException(
          `Cannot change addon pricing - ${protection.reason}. Pricing is locked after payments are made.`,
        );
      }
    }

    return await this.addonsModel.update(dto as any, {
      where: { uuid },
    });
  }

  /**
   * Delete addon (with protection check)
   */
  async delete(uuid: string): Promise<number> {
    // Get the addon to check wedding group
    const addon = await this.addonsModel.findOne({
      where: { uuid },
      attributes: ['wedding_group_id'],
      raw: true,
    });

    if (!addon) {
      throw new NotFoundException('Addon not found');
    }

    // Check payment protection
    const protection = await this.hasPaymentProtection(addon.wedding_group_id);
    if (protection.isProtected) {
      throw new BadRequestException(
        `Cannot delete addon - ${protection.reason}. Configuration is locked after payments are made.`,
      );
    }

    return await this.addonsModel.destroy({
      where: { uuid },
    });
  }

  /**
   * Sync addons (bulk update/create) with protection check
   * Replaces all existing addons with new ones
   */
  async syncAddons(weddingGroupId: number, addons: CreateGroupAddonDto[]): Promise<GroupAddons[]> {
    // Check payment protection before syncing
    const protection = await this.hasPaymentProtection(weddingGroupId);
    if (protection.isProtected) {
      throw new BadRequestException(
        `Cannot sync addons - ${protection.reason}. Addon configuration is locked after payments are made.`,
      );
    }

    // Delete existing addons
    await this.addonsModel.destroy({
      where: { wedding_group_id: weddingGroupId },
    });

    // Create new addons
    const created: GroupAddons[] = [];
    for (const addon of addons) {
      const groupAddon = await this.addonsModel.create({
        uuid: uuidv4(),
        wedding_group_id: weddingGroupId,
        ...addon,
      } as any);
      created.push(groupAddon);
    }

    return created;
  }

  /**
   * Toggle addon active status
   */
  async toggleStatus(uuid: string, isActive: boolean): Promise<[number]> {
    return await this.addonsModel.update(
      { is_active: isActive },
      { where: { uuid } },
    );
  }

  /**
   * Get active addons for public booking page
   */
  async getActiveAddons(weddingGroupId: number): Promise<GroupAddons[]> {
    return await this.addonsModel.findAll({
      where: {
        wedding_group_id: weddingGroupId,
        is_active: true,
      },
      order: [['addon_type', 'ASC']],
    });
  }
}
