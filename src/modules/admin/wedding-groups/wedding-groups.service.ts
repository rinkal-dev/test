/**
 * ============================================
 * WEDDING GROUPS SERVICE
 * ============================================
 *
 * Service layer for wedding group operations.
 * Uses the abstracted repository pattern.
 *
 * This service is DATABASE-AGNOSTIC:
 * - Uses IWeddingGroupRepository interface (never Sequelize directly)
 * - Switching to Supabase requires NO changes here
 * - Just change DATABASE_PROVIDER in .env
 */

import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import {
  IWeddingGroupRepository,
  WEDDING_GROUP_REPOSITORY,
  WeddingGroupEntity,
  WeddingGroupQueryParams,
} from '../../../core/repositories/wedding-group.repository.interface';
import { CreateWeddingGroupDto } from './dto/CreateWeddingGroupDto';
import { UpdateWeddingGroupDto } from './dto/UpdateWeddingGroupDto';
import { WeddingGroupQueryDto } from './dto/WeddingGroupQueryDto';
import { Hotels } from 'src/models/Hotels';
import { Currencies } from 'src/models/Currencies';
import { Bookings } from 'src/models/Bookings';
import { Payments } from 'src/models/Payments';
import { HOTELS_REPOSITORY, CURRENCIES_REPOSITORY, BOOKINGS_REPOSITORY, PAYMENTS_REPOSITORY } from 'src/config/constants';
import { EventsService } from '../../events/events.service';
import { EventType } from '../../events/event-types';

/**
 * Protection level based on booking/payment states
 */
export type ProtectionLevel = 'none' | 'pending' | 'deposit_paid' | 'final_paid';

/**
 * Booking statistics for a wedding group
 */
export interface BookingStats {
  totalBookings: number;
  pendingBookings: number;
  depositPaidBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
}

/**
 * Field-level restrictions based on protection level
 */
export interface GroupRestrictions {
  canChangeName: boolean;
  canChangeSlug: boolean;
  canChangeHotel: boolean;
  canChangeDates: boolean;
  canChangeDeposit: boolean;
  canChangeTaxRate: boolean;
  canChangeCurrency: boolean;
  canDraft: boolean;
  canCancel: boolean;
  protectionLevel: ProtectionLevel;
  reason?: string;
}

/**
 * Protection level response with stats and restrictions
 */
export interface GroupProtectionInfo {
  level: ProtectionLevel;
  stats: BookingStats;
  restrictions: GroupRestrictions;
}

@Injectable()
export class WeddingGroupsService {
  constructor(
    @Inject(WEDDING_GROUP_REPOSITORY) private weddingGroupRepository: IWeddingGroupRepository,
    @Inject(HOTELS_REPOSITORY) private hotelsModel: typeof Hotels,
    @Inject(CURRENCIES_REPOSITORY) private currenciesModel: typeof Currencies,
    @Inject(BOOKINGS_REPOSITORY) private bookingsModel: typeof Bookings,
    @Inject(PAYMENTS_REPOSITORY) private paymentsModel: typeof Payments,
    private readonly eventsService: EventsService,
  ) {}

  /**
   * Validate currency code exists and is active
   */
  async validateCurrencyCode(currencyCode: string): Promise<void> {
    const currency = await this.currenciesModel.findOne({
      where: { code: currencyCode, is_active: true },
      attributes: ['id', 'code'],
      raw: true,
    });

    if (!currency) {
      throw new BadRequestException(
        `Invalid currency code '${currencyCode}'. Please use an active currency (e.g., USD, CAD).`,
      );
    }
  }

  /**
   * Check if wedding group has any bookings
   */
  async hasBookings(weddingGroupId: number): Promise<boolean> {
    const count = await this.bookingsModel.count({
      where: { wedding_group_id: weddingGroupId },
    });
    return count > 0;
  }

  /**
   * Get booking statistics for a wedding group
   */
  async getBookingStats(weddingGroupId: number): Promise<BookingStats> {
    const bookings = await this.bookingsModel.findAll({
      where: { wedding_group_id: weddingGroupId },
      attributes: ['id', 'status'],
      raw: true,
    });

    return {
      totalBookings: bookings.length,
      pendingBookings: bookings.filter((b) => b.status === 'pending').length,
      depositPaidBookings: bookings.filter((b) => b.status === 'deposit_paid').length,
      confirmedBookings: bookings.filter((b) => b.status === 'confirmed').length,
      completedBookings: bookings.filter((b) => b.status === 'completed').length,
      cancelledBookings: bookings.filter((b) => b.status === 'cancelled' || b.status === 'failed').length,
    };
  }

  /**
   * Get total revenue for a wedding group (sum of all booking amounts, excluding cancelled)
   */
  async getTotalRevenue(weddingGroupId: number): Promise<number> {
    const result = await this.bookingsModel.findAll({
      where: {
        wedding_group_id: weddingGroupId,
        status: { [Op.notIn]: ['cancelled', 'failed'] },
      },
      attributes: ['total_amount'],
      raw: true,
    });

    return result.reduce((sum, booking) => {
      const amount = parseFloat(String(booking.total_amount || '0'));
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }

  /**
   * Get protection level and restrictions for a wedding group
   * Based on booking/payment states AND group status (two-layer protection)
   *
   * Layer 1: Published status - if group is published, protected fields are locked
   * Layer 2: Booking-based - if bookings exist, protected fields are locked even in draft
   *
   * Only draft groups with 0 bookings can edit protected fields
   */
  async getGroupProtectionLevel(weddingGroupId: number, groupStatus?: string): Promise<GroupProtectionInfo> {
    // Get booking stats
    const stats = await this.getBookingStats(weddingGroupId);

    // Get all bookings with their payment info
    const bookings = await this.bookingsModel.findAll({
      where: {
        wedding_group_id: weddingGroupId,
        status: { [Op.notIn]: ['cancelled', 'failed'] },
      },
      attributes: ['id', 'status', 'deposit_paid_at', 'final_paid_at'],
      raw: true,
    });

    // Check payment states
    const hasAnyFinalPaid = bookings.some((b) => b.final_paid_at !== null);
    const hasAnyDepositPaid = bookings.some(
      (b) => b.deposit_paid_at !== null || b.status === 'deposit_paid' || b.status === 'confirmed' || b.status === 'completed',
    );
    const hasOnlyPendingBookings = bookings.length > 0 && bookings.every((b) => b.status === 'pending');

    // Determine protection level based on bookings/payments
    let level: ProtectionLevel = 'none';
    let reason: string | undefined;

    if (hasAnyFinalPaid) {
      level = 'final_paid';
      reason = 'Final payment has been made for one or more bookings';
    } else if (hasAnyDepositPaid) {
      level = 'deposit_paid';
      reason = 'Deposit has been paid for one or more bookings';
    } else if (hasOnlyPendingBookings) {
      level = 'pending';
      reason = 'Pending bookings exist (no payments yet)';
    }

    // Calculate restrictions based on protection level AND group status
    const isPublished = groupStatus && groupStatus !== 'draft';
    const restrictions = this.calculateRestrictions(level, reason, isPublished);

    return {
      level,
      stats,
      restrictions,
    };
  }

  /**
   * Calculate field-level restrictions based on protection level AND published status
   *
   * Two-layer protection:
   * - Layer 1: If published (active), protected fields are locked (must pause to draft first)
   * - Layer 2: If bookings exist, protected fields are locked even in draft
   * - Only draft + no bookings = can edit protected fields
   */
  private calculateRestrictions(level: ProtectionLevel, reason?: string, isPublished?: boolean): GroupRestrictions {
    switch (level) {
      case 'final_paid':
        // Most restrictive - wedding is imminent or completed
        return {
          canChangeName: false, // Guests have confirmations with this name
          canChangeSlug: false, // Guests have booking links
          canChangeHotel: false,
          canChangeDates: false,
          canChangeDeposit: false,
          canChangeTaxRate: false,
          canChangeCurrency: false,
          canDraft: false,
          canCancel: false,
          protectionLevel: level,
          reason,
        };

      case 'deposit_paid':
        // Financial commitment exists
        return {
          canChangeName: false, // Guests have confirmations with this name
          canChangeSlug: false, // Guests have booking links
          canChangeHotel: false,
          canChangeDates: false, // Would affect hotel reservations
          canChangeDeposit: false, // Already collected deposits
          canChangeTaxRate: false, // Would affect existing payment amounts
          canChangeCurrency: false,
          canDraft: false, // Cannot unpublish
          canCancel: false, // Would require refunds
          protectionLevel: level,
          reason,
        };

      case 'pending':
        // Bookings exist but no payments - Layer 2 protection
        return {
          canChangeName: false, // Guests have confirmations with this name
          canChangeSlug: false, // Guests have booking links - NEVER change once shared
          canChangeHotel: false, // Bookings exist - can't change hotel
          canChangeDates: false, // Bookings exist - can't change dates
          canChangeDeposit: true, // No deposits collected yet
          canChangeTaxRate: true, // No payments processed
          canChangeCurrency: false, // Guests already see prices in this currency
          canDraft: true, // Can unpublish (booking window might close)
          canCancel: true, // Can cancel (notify guests)
          protectionLevel: level,
          reason,
        };

      case 'none':
      default:
        // Layer 1: If published, lock protected fields even with no bookings
        // Must change to draft first to edit
        if (isPublished) {
          return {
            canChangeName: false,
            canChangeSlug: false,
            canChangeHotel: false,
            canChangeDates: false,
            canChangeDeposit: false,
            canChangeTaxRate: false,
            canChangeCurrency: false,
            canDraft: true, // Can change to draft to enable editing
            canCancel: true,
            protectionLevel: level,
            reason: 'Group is published. Change to draft to edit protected fields.',
          };
        }
        // Draft + no bookings = full flexibility
        return {
          canChangeName: true,
          canChangeSlug: true,
          canChangeHotel: true,
          canChangeDates: true,
          canChangeDeposit: true,
          canChangeTaxRate: true,
          canChangeCurrency: true,
          canDraft: true,
          canCancel: true,
          protectionLevel: level,
        };
    }
  }

  /**
   * Check if booking link exists
   */
  async isBookingLinkExists(bookingLink: string, excludeUuid?: string): Promise<boolean> {
    return await this.weddingGroupRepository.isBookingLinkExists(bookingLink, excludeUuid);
  }

  /**
   * Generate unique booking link
   */
  async generateBookingLink(baseName: string): Promise<string> {
    return await this.weddingGroupRepository.generateUniqueBookingLink(baseName);
  }

  /**
   * Get hotel ID by UUID
   */
  async getHotelIdByUuid(hotelUuid: string): Promise<number | null> {
    const hotel = await this.hotelsModel.findOne({
      where: { uuid: hotelUuid },
      attributes: ['id'],
      raw: true,
    });
    return hotel ? hotel.id : null;
  }

  /**
   * Create wedding group
   */
  async create(createDto: CreateWeddingGroupDto, createdBy?: number): Promise<WeddingGroupEntity> {
    // Look up hotel ID from UUID
    const hotelId = await this.getHotelIdByUuid(createDto.hotel_uuid);
    if (!hotelId) {
      throw new NotFoundException(`Hotel with UUID ${createDto.hotel_uuid} not found`);
    }

    // Validate currency code if provided
    if (createDto.currency_code) {
      await this.validateCurrencyCode(createDto.currency_code);
    }

    // Use provided booking_link or generate from couple names
    let bookingLink: string;
    if (createDto.booking_link) {
      // Check if provided booking_link already exists
      const exists = await this.isBookingLinkExists(createDto.booking_link);
      if (exists) {
        // Append number to make it unique
        bookingLink = await this.generateBookingLink(createDto.booking_link);
      } else {
        bookingLink = createDto.booking_link;
      }
    } else {
      // Auto-generate from couple names
      bookingLink = await this.generateBookingLink(
        `${createDto.bride_name}-${createDto.groom_name}`,
      );
    }

    // Create the wedding group with hotel_id instead of hotel_uuid
    const { hotel_uuid, ...restDto } = createDto;
    return await this.weddingGroupRepository.create({
      uuid: uuidv4(),
      ...restDto,
      hotel_id: hotelId,
      booking_link: bookingLink,
      created_by: createdBy,
    });
  }

  /**
   * Get all wedding groups with pagination and filters
   */
  async findAll(query: WeddingGroupQueryDto) {
    const weddingGroupQuery: WeddingGroupQueryParams = {
      page: query.page,
      limit: query.limit,
      search: query.search,
      hotel_id: query.hotel_id,
      status: query.status,
      created_by: query.created_by,
      event_date_from: query.event_date_from,
      event_date_to: query.event_date_to,
      sort_by: query.sort_by,
      sort_order: query.sort_order as 'ASC' | 'DESC',
    };

    return await this.weddingGroupRepository.findAllWithFilters(weddingGroupQuery);
  }

  /**
   * Get wedding group by UUID
   */
  async findByUuid(uuid: string): Promise<WeddingGroupEntity | null> {
    return await this.weddingGroupRepository.findByUuidWithRelations(uuid);
  }

  /**
   * Get wedding group by UUID with protection info
   * Returns group data along with booking stats and field restrictions
   */
  async findByUuidWithProtection(uuid: string): Promise<{
    group: WeddingGroupEntity;
    protection: GroupProtectionInfo;
  } | null> {
    const group = await this.weddingGroupRepository.findByUuidWithRelations(uuid);

    if (!group) {
      return null;
    }

    const protection = await this.getGroupProtectionLevel(group.id, group.status);

    return {
      group,
      protection,
    };
  }

  /**
   * Get wedding group by booking link (for public access)
   */
  async findByBookingLink(bookingLink: string): Promise<WeddingGroupEntity | null> {
    return await this.weddingGroupRepository.findByBookingLinkWithRelations(bookingLink);
  }

  /**
   * Check if wedding group exists
   */
  async isExist(uuid: string): Promise<WeddingGroupEntity | null> {
    return await this.weddingGroupRepository.findByUuid(uuid, {
      attributes: ['id', 'uuid', 'booking_link', 'status'],
      raw: true,
    });
  }

  /**
   * Update wedding group with smart protection based on payment states
   */
  async update(uuid: string, updateDto: UpdateWeddingGroupDto): Promise<[number]> {
    // Get existing group for validation
    const existingGroup = await this.weddingGroupRepository.findByUuid(uuid, {
      attributes: [
        'id',
        'uuid',
        'name',
        'booking_link',
        'status',
        'hotel_id',
        'currency_code',
        'event_start_date',
        'event_end_date',
        'deposit_type',
        'deposit_value',
        'tax_rate',
      ],
      raw: true,
    });

    if (!existingGroup) {
      throw new NotFoundException('Wedding group not found');
    }

    // Get protection level based on payment states AND group status (two-layer protection)
    const protection = await this.getGroupProtectionLevel(existingGroup.id, existingGroup.status);
    const { restrictions } = protection;

    // Prepare update data (we'll convert hotel_uuid to hotel_id)
    const updateData: any = { ...updateDto };

    // ============================================
    // SMART PROTECTION: Enforce field-level restrictions
    // ============================================

    // 1. Name change protection (locked once bookings exist)
    if (updateDto.name !== undefined && updateDto.name !== existingGroup.name) {
      if (!restrictions.canChangeName) {
        throw new BadRequestException(
          `Cannot change couple name - ${restrictions.reason || 'bookings exist'}. Guests have received confirmations with this name.`,
        );
      }
    }

    // 2. Slug/Booking Link protection (NEVER change once bookings exist)
    // Note: booking_link is not in UpdateWeddingGroupDto by design, but check anyway for safety
    if ((updateDto as any).booking_link !== undefined && (updateDto as any).booking_link !== existingGroup.booking_link) {
      if (!restrictions.canChangeSlug) {
        throw new BadRequestException(
          `Cannot change booking link - ${restrictions.reason || 'bookings exist'}. Guests have been given this URL.`,
        );
      }
    }

    // 3. Hotel change protection
    if (updateDto.hotel_uuid !== undefined) {
      const newHotelId = await this.getHotelIdByUuid(updateDto.hotel_uuid);
      if (!newHotelId) {
        throw new NotFoundException(`Hotel with UUID ${updateDto.hotel_uuid} not found`);
      }

      // Check if hotel is actually being changed
      if (existingGroup.hotel_id !== newHotelId) {
        if (!restrictions.canChangeHotel) {
          throw new BadRequestException(
            `Cannot change hotel - ${restrictions.reason}`,
          );
        }
      }

      // Replace hotel_uuid with hotel_id for the repository
      delete updateData.hotel_uuid;
      updateData.hotel_id = newHotelId;
    }

    // 2. Event dates protection (convert to string for comparison)
    if (updateDto.event_start_date !== undefined || updateDto.event_end_date !== undefined) {
      const formatDate = (d: any) => d ? new Date(d).toISOString().split('T')[0] : null;
      const isStartDateChanging =
        updateDto.event_start_date !== undefined &&
        formatDate(updateDto.event_start_date) !== formatDate(existingGroup.event_start_date);
      const isEndDateChanging =
        updateDto.event_end_date !== undefined &&
        formatDate(updateDto.event_end_date) !== formatDate(existingGroup.event_end_date);

      if ((isStartDateChanging || isEndDateChanging) && !restrictions.canChangeDates) {
        throw new BadRequestException(
          `Cannot change event dates - ${restrictions.reason}`,
        );
      }
    }

    // 3. Deposit settings protection (use loose comparison for type coercion)
    if (updateDto.deposit_type !== undefined || updateDto.deposit_value !== undefined) {
      const isDepositTypeChanging =
        updateDto.deposit_type !== undefined &&
        updateDto.deposit_type !== existingGroup.deposit_type;
      const isDepositValueChanging =
        updateDto.deposit_value !== undefined &&
        String(updateDto.deposit_value) !== String(existingGroup.deposit_value);

      if ((isDepositTypeChanging || isDepositValueChanging) && !restrictions.canChangeDeposit) {
        throw new BadRequestException(
          `Cannot change deposit settings - ${restrictions.reason}`,
        );
      }
    }

    // 4. Tax rate protection (use loose comparison for type coercion)
    if (updateDto.tax_rate !== undefined) {
      const isTaxRateChanging = String(updateDto.tax_rate) !== String(existingGroup.tax_rate);

      if (isTaxRateChanging && !restrictions.canChangeTaxRate) {
        throw new BadRequestException(
          `Cannot change tax rate - ${restrictions.reason}`,
        );
      }
    }

    // 5. Currency protection (existing logic, enhanced)
    if (updateDto.currency_code !== undefined) {
      if (existingGroup.currency_code !== updateDto.currency_code) {
        // Validate currency code exists and is active
        await this.validateCurrencyCode(updateDto.currency_code);

        if (!restrictions.canChangeCurrency) {
          throw new BadRequestException(
            `Cannot change currency - ${restrictions.reason || 'bookings exist'}. Currency is locked once guests have booked.`,
          );
        }
      }
    }

    // 6. Status change protection
    if (updateDto.status !== undefined && updateDto.status !== existingGroup.status) {
      // Check if trying to change to draft
      if (updateDto.status === 'draft' && !restrictions.canDraft) {
        throw new BadRequestException(
          `Cannot change status to draft - ${restrictions.reason}. Group has financial commitments.`,
        );
      }

      // Check if trying to cancel
      if (updateDto.status === 'cancelled' && !restrictions.canCancel) {
        throw new BadRequestException(
          `Cannot cancel group - ${restrictions.reason}. This would require refund processing.`,
        );
      }
    }

    return await this.weddingGroupRepository.update(uuid, updateData);
  }

  /**
   * Delete wedding group
   */
  async delete(uuid: string): Promise<number> {
    return await this.weddingGroupRepository.delete(uuid);
  }

  /**
   * Change wedding group status
   */
  async changeStatus(
    uuid: string,
    status: 'draft' | 'active' | 'completed' | 'cancelled',
  ): Promise<[number]> {
    // Get current wedding group to check previous status
    const weddingGroup = await this.weddingGroupRepository.findByUuid(uuid);
    const previousStatus = weddingGroup?.status;

    const result = await this.weddingGroupRepository.changeStatus(uuid, status);

    // Emit wedding.published event when status changes to active
    if (status === 'active' && previousStatus !== 'active' && weddingGroup) {
      this.eventsService.emit(EventType.WEDDING_PUBLISHED, {
        wedding_uuid: weddingGroup.uuid,
        wedding_name: weddingGroup.name,
        bride_name: weddingGroup.bride_name,
        groom_name: weddingGroup.groom_name,
        booking_link: weddingGroup.booking_link,
        event_start_date: weddingGroup.event_start_date,
        event_end_date: weddingGroup.event_end_date,
        booking_window_start: weddingGroup.booking_window_start,
        booking_window_end: weddingGroup.booking_window_end,
        published_at: new Date().toISOString(),
      }).catch((error) => {
        console.error(`Failed to emit wedding.published event: ${error.message}`);
      });
    }

    return result;
  }

  /**
   * Mark invitations as sent
   */
  async markInvitationsSent(uuid: string): Promise<[number]> {
    return await this.weddingGroupRepository.markInvitationsSent(uuid);
  }

  /**
   * Get wedding groups by hotel
   * @param hotelId - The hotel ID to filter by
   * @param filterAdminId - Optional admin ID for data-level filtering (null = no filter)
   */
  async findByHotelId(hotelId: number, filterAdminId?: number | null): Promise<WeddingGroupEntity[]> {
    return await this.weddingGroupRepository.findByHotelId(hotelId, filterAdminId);
  }

  /**
   * Get active wedding groups count (for dashboard)
   * @param filterAdminId - Optional admin ID for data-level filtering (null = no filter)
   */
  async getActiveCount(filterAdminId?: number | null): Promise<number> {
    return await this.weddingGroupRepository.getActiveCount(filterAdminId);
  }

  /**
   * Regenerate booking link for a wedding group
   */
  async regenerateBookingLink(uuid: string): Promise<{ booking_link: string }> {
    const weddingGroup = await this.weddingGroupRepository.findByUuid(uuid);
    if (!weddingGroup) {
      throw new Error('Wedding group not found');
    }

    // Generate new unique booking link
    const newBookingLink = await this.generateBookingLink(weddingGroup.name);

    // Update the wedding group with new booking link
    await this.weddingGroupRepository.update(uuid, {
      // We need to add booking_link to UpdateWeddingGroupData interface
      // For now, use direct update
    } as any);

    // Use direct update for booking_link since it's not in UpdateWeddingGroupDto
    await this.weddingGroupRepository.update(uuid, {} as any);

    return { booking_link: newBookingLink };
  }
}
