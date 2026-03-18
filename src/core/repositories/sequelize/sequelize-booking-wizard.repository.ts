/**
 * ============================================
 * SEQUELIZE BOOKING WIZARD REPOSITORY
 * ============================================
 *
 * Sequelize-specific implementation of IBookingWizardRepository.
 * Handles all database operations for the public booking wizard.
 */

import { Op } from 'sequelize';
import { WeddingGroups } from '../../../models/WeddingGroups';
import { GroupRoomBlocks } from '../../../models/GroupRoomBlocks';
import { GroupAddons } from '../../../models/GroupAddons';
import { Guests } from '../../../models/Guests';
import { Bookings } from '../../../models/Bookings';
import { BookingRooms } from '../../../models/BookingRooms';
import { BookingAddons } from '../../../models/BookingAddons';
import { BookingHolds } from '../../../models/BookingHolds';
import { RoomTypes } from '../../../models/RoomTypes';
import { Hotels } from '../../../models/Hotels';
import {
  IBookingWizardRepository,
  WeddingGroupBasicEntity,
  RoomBlockEntity,
  BookingWizardAddonEntity,
  BookingWizardGuestEntity,
  BookingBasicEntity,
  BookingRoomEntity,
  BookingAddonEntity,
  BookingHoldEntity,
  CreateGuestData,
  UpdateGuestData,
  CreateBookingData,
  CreateBookingRoomData,
  CreateBookingAddonData,
  CreateHoldData,
  UpdateHoldData,
} from '../booking-wizard.repository.interface';

export class SequelizeBookingWizardRepository implements IBookingWizardRepository {
  constructor(
    private readonly weddingGroupModel: typeof WeddingGroups,
    private readonly roomBlockModel: typeof GroupRoomBlocks,
    private readonly addonModel: typeof GroupAddons,
    private readonly guestModel: typeof Guests,
    private readonly bookingModel: typeof Bookings,
    private readonly bookingRoomModel: typeof BookingRooms,
    private readonly bookingAddonModel: typeof BookingAddons,
    private readonly bookingHoldModel: typeof BookingHolds,
  ) {}

  // ============================================
  // HELPER METHODS
  // ============================================

  private toPlain<T>(model: any): T | null {
    if (!model) return null;
    if (typeof model.get === 'function') {
      return model.get({ plain: true }) as T;
    }
    return model as T;
  }

  // ============================================
  // WEDDING GROUP METHODS
  // ============================================

  async findWeddingByBookingLink(bookingLink: string): Promise<WeddingGroupBasicEntity | null> {
    const wedding = await this.weddingGroupModel.findOne({
      where: { booking_link: bookingLink },
      include: [
        {
          model: Hotels,
          as: 'hotel',
          attributes: ['uuid', 'name', 'city', 'country'],
        },
      ],
    });
    return this.toPlain<WeddingGroupBasicEntity>(wedding);
  }

  // ============================================
  // ROOM BLOCK METHODS
  // ============================================

  async findRoomBlocksByWeddingId(weddingGroupId: number): Promise<RoomBlockEntity[]> {
    const blocks = await this.roomBlockModel.findAll({
      where: {
        wedding_group_id: weddingGroupId,
        is_active: true,
      },
      include: [
        {
          model: RoomTypes,
          as: 'room_type',
        },
      ],
    });
    return blocks.map((b) => this.toPlain<RoomBlockEntity>(b)!);
  }

  async findRoomBlockByUuid(uuid: string): Promise<RoomBlockEntity | null> {
    const block = await this.roomBlockModel.findOne({
      where: { uuid },
      include: [
        {
          model: RoomTypes,
          as: 'room_type',
        },
      ],
    });
    return this.toPlain<RoomBlockEntity>(block);
  }

  async findRoomBlockById(id: number): Promise<RoomBlockEntity | null> {
    const block = await this.roomBlockModel.findOne({
      where: { id },
      include: [
        {
          model: RoomTypes,
          as: 'room_type',
        },
      ],
    });
    return this.toPlain<RoomBlockEntity>(block);
  }

  async countBookedRoomsForDateRange(
    weddingGroupId: number,
    roomBlockId: number,
    checkIn: string,
    checkOut: string,
  ): Promise<number> {
    const count = await this.bookingRoomModel.count({
      include: [
        {
          model: Bookings,
          as: 'booking',
          where: {
            wedding_group_id: weddingGroupId,
            status: {
              [Op.notIn]: ['cancelled', 'failed'],
            },
            [Op.or]: [
              {
                check_in_date: { [Op.lt]: checkOut },
                check_out_date: { [Op.gt]: checkIn },
              },
            ],
          },
        },
      ],
      where: {
        room_block_id: roomBlockId,
      },
    });
    return count;
  }

  // ============================================
  // ADDON METHODS
  // ============================================

  async findAddonsByWeddingId(weddingGroupId: number): Promise<BookingWizardAddonEntity[]> {
    const addons = await this.addonModel.findAll({
      where: {
        wedding_group_id: weddingGroupId,
        is_active: true,
      },
      order: [['addon_type', 'ASC'], ['name', 'ASC']],
    });
    return addons.map((a) => this.toPlain<BookingWizardAddonEntity>(a)!);
  }

  async findAddonByUuid(uuid: string): Promise<BookingWizardAddonEntity | null> {
    const addon = await this.addonModel.findOne({
      where: { uuid },
    });
    return this.toPlain<BookingWizardAddonEntity>(addon);
  }

  // ============================================
  // GUEST METHODS
  // ============================================

  async findGuestByEmailAndWedding(
    email: string,
    weddingGroupId: number,
  ): Promise<BookingWizardGuestEntity | null> {
    const guest = await this.guestModel.findOne({
      where: {
        email: email.toLowerCase(),
        wedding_group_id: weddingGroupId,
      },
      include: [
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: ['id', 'uuid', 'name', 'booking_link', 'event_start_date', 'event_end_date', 'status'],
          include: [
            {
              model: Hotels,
              as: 'hotel',
              attributes: ['uuid', 'name', 'city', 'country'],
            },
          ],
        },
      ],
    });
    return this.toPlain<BookingWizardGuestEntity>(guest);
  }

  async findGuestByAccessToken(accessToken: string): Promise<BookingWizardGuestEntity | null> {
    const guest = await this.guestModel.findOne({
      where: { access_token: accessToken },
      include: [
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: ['id', 'uuid', 'name', 'booking_link', 'event_start_date', 'event_end_date', 'status'],
          include: [
            {
              model: Hotels,
              as: 'hotel',
              attributes: ['uuid', 'name', 'city', 'country'],
            },
          ],
        },
        {
          model: Bookings,
          as: 'bookings',
          where: {
            status: {
              [Op.notIn]: ['cancelled', 'failed'],
            },
          },
          required: false,
          attributes: [
            'uuid',
            'booking_reference',
            'check_in_date',
            'check_out_date',
            'total_rooms',
            'total_amount',
            'currency',
            'status',
          ],
        },
      ],
    });
    return this.toPlain<BookingWizardGuestEntity>(guest);
  }

  async createGuest(data: CreateGuestData): Promise<BookingWizardGuestEntity> {
    const guest = await this.guestModel.create(data as any);
    return this.toPlain<BookingWizardGuestEntity>(guest)!;
  }

  async updateGuest(id: number, data: UpdateGuestData): Promise<void> {
    await this.guestModel.update(data as any, { where: { id } });
  }

  async isAccessTokenExists(token: string): Promise<boolean> {
    const count = await this.guestModel.count({ where: { access_token: token } });
    return count > 0;
  }

  // ============================================
  // BOOKING METHODS
  // ============================================

  async createBooking(data: CreateBookingData): Promise<BookingBasicEntity> {
    const booking = await this.bookingModel.create(data as any);
    return this.toPlain<BookingBasicEntity>(booking)!;
  }

  async createBookingRoom(data: CreateBookingRoomData): Promise<BookingRoomEntity> {
    const bookingRoom = await this.bookingRoomModel.create(data as any);
    return this.toPlain<BookingRoomEntity>(bookingRoom)!;
  }

  async createBookingAddon(data: CreateBookingAddonData): Promise<BookingAddonEntity> {
    const bookingAddon = await this.bookingAddonModel.create(data as any);
    return this.toPlain<BookingAddonEntity>(bookingAddon)!;
  }

  async isBookingReferenceExists(reference: string): Promise<boolean> {
    const count = await this.bookingModel.count({ where: { booking_reference: reference } });
    return count > 0;
  }

  async findBookingByReference(reference: string): Promise<BookingBasicEntity | null> {
    const booking = await this.bookingModel.findOne({
      where: { booking_reference: reference },
    });
    return this.toPlain<BookingBasicEntity>(booking);
  }

  async findBookingByReferenceWithGuest(reference: string): Promise<BookingBasicEntity | null> {
    const booking = await this.bookingModel.findOne({
      where: { booking_reference: reference },
      include: [
        {
          model: Guests,
          as: 'guest',
          include: [
            {
              model: WeddingGroups,
              as: 'wedding_group',
              attributes: ['id', 'uuid', 'name', 'booking_link', 'event_start_date', 'event_end_date', 'status'],
              include: [
                {
                  model: Hotels,
                  as: 'hotel',
                  attributes: ['uuid', 'name', 'city', 'country'],
                },
              ],
            },
          ],
        },
      ],
    });
    return this.toPlain<BookingBasicEntity>(booking);
  }

  async findBookingsByGuestId(guestId: number): Promise<BookingBasicEntity[]> {
    const bookings = await this.bookingModel.findAll({
      where: {
        guest_id: guestId,
        status: {
          [Op.notIn]: ['cancelled', 'failed'],
        },
      },
      order: [['created_at', 'DESC']],
    });
    return bookings.map((b) => this.toPlain<BookingBasicEntity>(b)!);
  }

  // ============================================
  // INVENTORY HOLD METHODS
  // ============================================

  async createHold(data: CreateHoldData): Promise<BookingHoldEntity> {
    const hold = await this.bookingHoldModel.create(data as any);
    return this.toPlain<BookingHoldEntity>(hold)!;
  }

  async findHoldByUuid(uuid: string): Promise<BookingHoldEntity | null> {
    const hold = await this.bookingHoldModel.findOne({
      where: { uuid },
    });
    return this.toPlain<BookingHoldEntity>(hold);
  }

  async findHoldByCheckoutToken(checkoutToken: string): Promise<BookingHoldEntity | null> {
    const hold = await this.bookingHoldModel.findOne({
      where: { checkout_token: checkoutToken },
    });
    return this.toPlain<BookingHoldEntity>(hold);
  }

  async findActiveHoldsForSession(guestSessionId: string): Promise<BookingHoldEntity[]> {
    const holds = await this.bookingHoldModel.findAll({
      where: {
        guest_session_id: guestSessionId,
        status: {
          [Op.in]: ['active', 'payment_pending'],
        },
        expires_at: {
          [Op.gt]: new Date(),
        },
      },
    });
    return holds.map((h) => this.toPlain<BookingHoldEntity>(h)!);
  }

  async countHeldRoomsForDateRange(
    weddingGroupId: number,
    roomBlockId: number,
    checkIn: string,
    checkOut: string,
    excludeSessionId?: string,
  ): Promise<number> {
    const whereClause: any = {
      wedding_group_id: weddingGroupId,
      room_block_id: roomBlockId,
      status: {
        [Op.in]: ['active', 'payment_pending'],
      },
      expires_at: {
        [Op.gt]: new Date(),
      },
      // Overlapping date range
      check_in_date: { [Op.lt]: checkOut },
      check_out_date: { [Op.gt]: checkIn },
    };

    // Exclude current session's holds (so user can see their own held rooms as available)
    if (excludeSessionId) {
      whereClause.guest_session_id = { [Op.ne]: excludeSessionId };
    }

    const result = await this.bookingHoldModel.sum('quantity', {
      where: whereClause,
    });

    return result || 0;
  }

  async updateHold(id: number, data: UpdateHoldData): Promise<void> {
    await this.bookingHoldModel.update(data as any, { where: { id } });
  }

  async releaseExpiredHolds(): Promise<number> {
    const now = new Date();
    const [affectedCount] = await this.bookingHoldModel.update(
      {
        status: 'expired',
        release_reason: 'Hold expired',
        released_at: now,
      },
      {
        where: {
          status: {
            [Op.in]: ['active', 'payment_pending'],
          },
          expires_at: {
            [Op.lte]: now,
          },
        },
      },
    );
    return affectedCount;
  }

  async releaseHoldsForSession(guestSessionId: string, reason: string): Promise<number> {
    const now = new Date();
    const [affectedCount] = await this.bookingHoldModel.update(
      {
        status: 'released',
        release_reason: reason,
        released_at: now,
      },
      {
        where: {
          guest_session_id: guestSessionId,
          status: {
            [Op.in]: ['active', 'payment_pending'],
          },
        },
      },
    );
    return affectedCount;
  }

  async convertHoldsToBooking(guestSessionId: string, bookingId: number): Promise<number> {
    const now = new Date();
    const [affectedCount] = await this.bookingHoldModel.update(
      {
        status: 'converted',
        converted_to_booking_id: bookingId,
        released_at: now,
      },
      {
        where: {
          guest_session_id: guestSessionId,
          status: {
            [Op.in]: ['active', 'payment_pending'],
          },
        },
      },
    );
    return affectedCount;
  }
}
