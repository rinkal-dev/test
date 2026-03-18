/**
 * ============================================
 * GROUP ITINERARY SERVICE
 * ============================================
 *
 * Service for managing itinerary/schedule events within wedding groups.
 * Events are displayed on the guest portal timeline.
 */

import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { GroupItinerary } from 'src/models/GroupItinerary';
import { WeddingGroups } from 'src/models/WeddingGroups';
import { GROUP_ITINERARY_REPOSITORY, WEDDING_GROUPS_REPOSITORY } from 'src/config/constants';
import { CreateGroupItineraryDto } from './dto/CreateGroupItineraryDto';
import { UpdateGroupItineraryDto } from './dto/UpdateGroupItineraryDto';

@Injectable()
export class GroupItineraryService {
  constructor(
    @Inject(GROUP_ITINERARY_REPOSITORY) private itineraryModel: typeof GroupItinerary,
    @Inject(WEDDING_GROUPS_REPOSITORY) private weddingGroupsModel: typeof WeddingGroups,
  ) {}

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
   * Create an itinerary event
   */
  async create(weddingGroupId: number, dto: CreateGroupItineraryDto): Promise<GroupItinerary> {
    // Get max sort_order if not provided
    let sortOrder = dto.sort_order;
    if (sortOrder === undefined) {
      const maxSort = await this.itineraryModel.max('sort_order', {
        where: { wedding_group_id: weddingGroupId },
      });
      sortOrder = (maxSort as number || 0) + 1;
    }

    return await this.itineraryModel.create({
      uuid: uuidv4(),
      wedding_group_id: weddingGroupId,
      ...dto,
      sort_order: sortOrder,
    } as any);
  }

  /**
   * Find all itinerary events for a wedding group
   */
  async findAllByWeddingGroupId(weddingGroupId: number): Promise<GroupItinerary[]> {
    return await this.itineraryModel.findAll({
      where: { wedding_group_id: weddingGroupId },
      order: [['event_date', 'ASC'], ['sort_order', 'ASC']],
    });
  }

  /**
   * Find itinerary event by UUID
   */
  async findByUuid(uuid: string): Promise<GroupItinerary | null> {
    return await this.itineraryModel.findOne({
      where: { uuid },
    });
  }

  /**
   * Check if itinerary event exists
   */
  async isExist(uuid: string): Promise<GroupItinerary | null> {
    return await this.itineraryModel.findOne({
      where: { uuid },
      attributes: ['id', 'uuid'],
      raw: true,
    });
  }

  /**
   * Update itinerary event
   */
  async update(uuid: string, dto: UpdateGroupItineraryDto): Promise<[number]> {
    return await this.itineraryModel.update(dto as any, {
      where: { uuid },
    });
  }

  /**
   * Delete itinerary event
   */
  async delete(uuid: string): Promise<number> {
    return await this.itineraryModel.destroy({
      where: { uuid },
    });
  }

  /**
   * Sync itinerary events (bulk update/create)
   * Replaces all existing events with new ones
   */
  async syncItinerary(weddingGroupId: number, events: CreateGroupItineraryDto[]): Promise<GroupItinerary[]> {
    // Delete existing events
    await this.itineraryModel.destroy({
      where: { wedding_group_id: weddingGroupId },
    });

    // Create new events with auto-increment sort_order
    const created: GroupItinerary[] = [];
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const itineraryItem = await this.itineraryModel.create({
        uuid: uuidv4(),
        wedding_group_id: weddingGroupId,
        ...event,
        sort_order: event.sort_order ?? i,
      } as any);
      created.push(itineraryItem);
    }

    return created;
  }

  /**
   * Toggle itinerary event active status
   */
  async toggleStatus(uuid: string, isActive: boolean): Promise<[number]> {
    return await this.itineraryModel.update(
      { is_active: isActive },
      { where: { uuid } },
    );
  }

  /**
   * Get active itinerary events for public booking page
   */
  async getActiveItinerary(weddingGroupId: number): Promise<GroupItinerary[]> {
    return await this.itineraryModel.findAll({
      where: {
        wedding_group_id: weddingGroupId,
        is_active: true,
      },
      order: [['event_date', 'ASC'], ['sort_order', 'ASC']],
    });
  }

  /**
   * Reorder itinerary events
   */
  async reorder(weddingGroupId: number, orderedUuids: string[]): Promise<void> {
    for (let i = 0; i < orderedUuids.length; i++) {
      await this.itineraryModel.update(
        { sort_order: i },
        { where: { uuid: orderedUuids[i], wedding_group_id: weddingGroupId } },
      );
    }
  }
}
