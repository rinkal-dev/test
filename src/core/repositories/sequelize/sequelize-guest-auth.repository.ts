/**
 * ============================================
 * SEQUELIZE GUEST AUTH REPOSITORY
 * ============================================
 *
 * Sequelize-specific implementation of IGuestAuthRepository.
 * Handles all database operations for guest authentication.
 */

import { Op } from 'sequelize';
import { Guests } from '../../../models/Guests';
import { Bookings } from '../../../models/Bookings';
import { WeddingGroups } from '../../../models/WeddingGroups';
import { Hotels } from '../../../models/Hotels';
import {
  IGuestAuthRepository,
  GuestAuthEntity,
  GuestAuthBasicEntity,
  BookingWithGuestEntity,
} from '../guest-auth.repository.interface';

export class SequelizeGuestAuthRepository implements IGuestAuthRepository {
  constructor(
    private readonly guestModel: typeof Guests,
    private readonly bookingModel: typeof Bookings,
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
  // REPOSITORY METHODS
  // ============================================

  async findGuestByAccessToken(accessToken: string): Promise<GuestAuthEntity | null> {
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
      ],
    });
    return this.toPlain<GuestAuthEntity>(guest);
  }

  async findBookingByReferenceAndEmail(
    bookingReference: string,
    email: string,
  ): Promise<BookingWithGuestEntity | null> {
    const booking = await this.bookingModel.findOne({
      where: { booking_reference: bookingReference },
      include: [
        {
          model: Guests,
          as: 'guest',
          where: { email: email.toLowerCase() },
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
    return this.toPlain<BookingWithGuestEntity>(booking);
  }

  async findGuestById(guestId: number): Promise<GuestAuthBasicEntity | null> {
    const guest = await this.guestModel.findOne({
      where: { id: guestId },
      attributes: ['id', 'uuid', 'name', 'email', 'wedding_group_id', 'status'],
    });
    return this.toPlain<GuestAuthBasicEntity>(guest);
  }

  async findGuestByIdWithRelations(guestId: number): Promise<GuestAuthEntity | null> {
    const guest = await this.guestModel.findOne({
      where: { id: guestId },
      include: [
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: ['uuid', 'name', 'booking_link', 'event_start_date', 'event_end_date'],
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
    return this.toPlain<GuestAuthEntity>(guest);
  }

  async updateBookingPreferences(
    bookingUuid: string,
    guestId: number,
    specialRequests?: string,
  ): Promise<{ success: boolean; message?: string; data?: any }> {
    const booking = await this.bookingModel.findOne({
      where: { uuid: bookingUuid, guest_id: guestId },
    });

    if (!booking) {
      return { success: false, message: 'Booking not found or access denied' };
    }

    await booking.update({ special_requests: specialRequests || null });

    return {
      success: true,
      data: { special_requests: specialRequests },
    };
  }

  // ============================================
  // PASSWORD-BASED AUTHENTICATION METHODS
  // ============================================

  async findGuestByEmail(email: string): Promise<GuestAuthEntity | null> {
    const guest = await this.guestModel.findOne({
      where: { email: email.toLowerCase() },
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
    return this.toPlain<GuestAuthEntity>(guest);
  }

  async findAllGuestsByEmail(email: string): Promise<GuestAuthEntity[]> {
    const guests = await this.guestModel.findAll({
      where: { email: email.toLowerCase() },
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
    return guests.map((g) => this.toPlain<GuestAuthEntity>(g));
  }

  async findGuestByUuid(uuid: string): Promise<GuestAuthEntity | null> {
    const guest = await this.guestModel.findOne({
      where: { uuid },
      include: [
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: ['id', 'uuid', 'name', 'booking_link', 'event_start_date', 'event_end_date', 'status'],
        },
      ],
    });
    return this.toPlain<GuestAuthEntity>(guest);
  }

  async findGuestBySetPasswordToken(token: string): Promise<GuestAuthEntity | null> {
    const guest = await this.guestModel.findOne({
      where: {
        set_password_token: token,
        set_password_token_expires: {
          [Op.gt]: new Date(),
        },
      },
      include: [
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: ['id', 'uuid', 'name', 'booking_link', 'event_start_date', 'event_end_date', 'status'],
        },
      ],
    });
    return this.toPlain<GuestAuthEntity>(guest);
  }

  async findGuestByPasswordResetToken(token: string): Promise<GuestAuthEntity | null> {
    const guest = await this.guestModel.findOne({
      where: {
        password_reset_token: token,
        password_reset_expires: {
          [Op.gt]: new Date(),
        },
      },
      include: [
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: ['id', 'uuid', 'name', 'booking_link', 'event_start_date', 'event_end_date', 'status'],
        },
      ],
    });
    return this.toPlain<GuestAuthEntity>(guest);
  }

  async updateGuestPassword(
    guestId: number,
    hashedPassword: string,
  ): Promise<{ success: boolean; message?: string }> {
    const [affectedCount] = await this.guestModel.update(
      {
        password: hashedPassword,
        password_set_at: new Date(),
        // Clear any pending tokens when password is set
        set_password_token: null,
        set_password_token_expires: null,
        password_reset_token: null,
        password_reset_expires: null,
      },
      { where: { id: guestId } },
    );

    if (affectedCount === 0) {
      return { success: false, message: 'Guest not found' };
    }

    return { success: true };
  }

  async setPasswordResetToken(
    guestId: number,
    token: string,
    expiresAt: Date,
  ): Promise<{ success: boolean; message?: string }> {
    const [affectedCount] = await this.guestModel.update(
      {
        password_reset_token: token,
        password_reset_expires: expiresAt,
      },
      { where: { id: guestId } },
    );

    if (affectedCount === 0) {
      return { success: false, message: 'Guest not found' };
    }

    return { success: true };
  }

  async clearPasswordResetToken(guestId: number): Promise<{ success: boolean }> {
    await this.guestModel.update(
      {
        password_reset_token: null,
        password_reset_expires: null,
      },
      { where: { id: guestId } },
    );

    return { success: true };
  }

  async setSetPasswordToken(
    guestId: number,
    token: string,
    expiresAt: Date,
  ): Promise<{ success: boolean; message?: string }> {
    const [affectedCount] = await this.guestModel.update(
      {
        set_password_token: token,
        set_password_token_expires: expiresAt,
      },
      { where: { id: guestId } },
    );

    if (affectedCount === 0) {
      return { success: false, message: 'Guest not found' };
    }

    return { success: true };
  }

  async clearSetPasswordToken(guestId: number): Promise<{ success: boolean }> {
    await this.guestModel.update(
      {
        set_password_token: null,
        set_password_token_expires: null,
      },
      { where: { id: guestId } },
    );

    return { success: true };
  }
}
