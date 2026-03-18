import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Op } from 'sequelize';
import {
  BOOKINGS_REPOSITORY,
  WEDDING_GROUPS_REPOSITORY,
  GUESTS_REPOSITORY,
  PAYMENTS_REPOSITORY,
  GROUP_ROOM_BLOCKS_REPOSITORY,
} from 'src/config/constants';
import {
  Bookings,
  WeddingGroups,
  Guests,
  Hotels,
  GroupRoomBlocks,
  RoomTypes,
  Payments,
  BookingRooms,
} from 'src/models';
import {
  PaymentDueQueryDto,
  BookingsQueryDto,
  CheckinReminderQueryDto,
} from './dto/ExternalApiQueryDto';

@Injectable()
export class ExternalApiService {
  constructor(
    @Inject(BOOKINGS_REPOSITORY)
    private bookingsRepository: typeof Bookings,
    @Inject(WEDDING_GROUPS_REPOSITORY)
    private weddingGroupsRepository: typeof WeddingGroups,
    @Inject(GUESTS_REPOSITORY)
    private guestsRepository: typeof Guests,
    @Inject(GROUP_ROOM_BLOCKS_REPOSITORY)
    private roomBlocksRepository: typeof GroupRoomBlocks,
  ) {}

  /**
   * Get bookings with payment due within specified days
   */
  async getBookingsPaymentDue(query: PaymentDueQueryDto) {
    const days = query.days || 7;

    const where: any = {
      status: {
        [Op.in]: ['pending', 'deposit_paid'],
      },
    };

    // For deposit payments - pending bookings
    // For final payments - deposit_paid bookings
    if (query.payment_type === 'deposit') {
      where.status = 'pending';
    } else if (query.payment_type === 'final_payment') {
      where.status = 'deposit_paid';
    }

    const bookings = await this.bookingsRepository.findAll({
      where,
      include: [
        {
          model: Guests,
          as: 'guest',
          attributes: ['uuid', 'name', 'email', 'phone'],
        },
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: [
            'uuid',
            'name',
            'booking_link',
            'event_start_date',
            'final_payment_due_days',
            'timezone',
          ],
          include: [
            {
              model: Hotels,
              as: 'hotel',
              attributes: ['uuid', 'name'],
            },
          ],
        },
      ],
      order: [['created_at', 'ASC']],
    });

    // Filter based on due date calculation
    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    return bookings
      .filter((booking) => {
        const weddingGroup = booking.wedding_group;
        if (!weddingGroup) return false;

        // For deposit payments - check if booking is pending and created recently
        if (booking.status === 'pending') {
          // Deposit is typically due within a few days of booking
          const createdDate = new Date(booking.created_at);
          const depositDueDate = new Date(createdDate);
          depositDueDate.setDate(depositDueDate.getDate() + 7); // 7 days to pay deposit
          return depositDueDate <= targetDate && depositDueDate >= now;
        }

        // For final payments - calculate based on event date and final_payment_due_days
        if (booking.status === 'deposit_paid' && weddingGroup.event_start_date) {
          const eventDate = new Date(weddingGroup.event_start_date);
          const finalPaymentDueDate = new Date(eventDate);
          finalPaymentDueDate.setDate(
            finalPaymentDueDate.getDate() - (weddingGroup.final_payment_due_days || 30),
          );
          return finalPaymentDueDate <= targetDate && finalPaymentDueDate >= now;
        }

        return false;
      })
      .map((booking) => this.formatBookingForExternal(booking));
  }

  /**
   * Get bookings with upcoming check-in
   */
  async getUpcomingCheckins(query: CheckinReminderQueryDto) {
    const days = query.days || 7;
    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    const bookings = await this.bookingsRepository.findAll({
      where: {
        status: {
          [Op.in]: ['deposit_paid', 'confirmed'],
        },
        check_in_date: {
          [Op.between]: [now, targetDate],
        },
      },
      include: [
        {
          model: Guests,
          as: 'guest',
          attributes: ['uuid', 'name', 'email', 'phone'],
        },
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: ['uuid', 'name', 'timezone'],
          include: [
            {
              model: Hotels,
              as: 'hotel',
              attributes: ['uuid', 'name', 'address', 'city'],
            },
          ],
        },
      ],
      order: [['check_in_date', 'ASC']],
    });

    return bookings.map((booking) => this.formatBookingForExternal(booking));
  }

  /**
   * Get bookings with filters
   */
  async getBookings(query: BookingsQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.wedding_uuid) {
      const wedding = await this.weddingGroupsRepository.findOne({
        where: { uuid: query.wedding_uuid },
      });
      if (wedding) {
        where.wedding_group_id = wedding.id;
      }
    }

    if (query.check_in_from || query.check_in_to) {
      where.check_in_date = {};
      if (query.check_in_from) {
        where.check_in_date[Op.gte] = query.check_in_from;
      }
      if (query.check_in_to) {
        where.check_in_date[Op.lte] = query.check_in_to;
      }
    }

    const { rows, count } = await this.bookingsRepository.findAndCountAll({
      where,
      include: [
        {
          model: Guests,
          as: 'guest',
          attributes: ['uuid', 'name', 'email', 'phone'],
        },
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: ['uuid', 'name', 'booking_link', 'event_start_date', 'timezone'],
          include: [
            {
              model: Hotels,
              as: 'hotel',
              attributes: ['uuid', 'name'],
            },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
      offset,
      limit,
    });

    return {
      data: rows.map((booking) => this.formatBookingForExternal(booking)),
      meta: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Get booking by reference number
   */
  async getBookingByReference(reference: string) {
    const booking = await this.bookingsRepository.findOne({
      where: { booking_reference: reference },
      include: [
        {
          model: Guests,
          as: 'guest',
          attributes: ['uuid', 'name', 'email', 'phone', 'address'],
        },
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: [
            'uuid',
            'name',
            'booking_link',
            'bride_name',
            'groom_name',
            'event_start_date',
            'event_end_date',
            'timezone',
          ],
          include: [
            {
              model: Hotels,
              as: 'hotel',
              attributes: ['uuid', 'name', 'address', 'city', 'country'],
            },
          ],
        },
        {
          model: BookingRooms,
          as: 'booking_rooms',
          include: [
            {
              model: GroupRoomBlocks,
              as: 'room_block',
              include: [
                {
                  model: RoomTypes,
                  as: 'room_type',
                  attributes: ['uuid', 'name'],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return this.formatBookingForExternal(booking, true);
  }

  /**
   * Get guests for a wedding group by booking_link
   */
  async getWeddingGuests(bookingLink: string) {
    const wedding = await this.weddingGroupsRepository.findOne({
      where: { booking_link: bookingLink },
    });

    if (!wedding) {
      throw new NotFoundException('Wedding not found');
    }

    const guests = await this.guestsRepository.findAll({
      where: { wedding_group_id: wedding.id },
      attributes: ['uuid', 'name', 'email', 'phone', 'created_at'],
      include: [
        {
          model: Bookings,
          as: 'bookings',
          attributes: [
            'uuid',
            'booking_reference',
            'status',
            'check_in_date',
            'check_out_date',
            'total_amount',
            'deposit_amount',
          ],
        },
      ],
      order: [['name', 'ASC']],
    });

    return {
      wedding: {
        uuid: wedding.uuid,
        name: wedding.name,
        booking_link: wedding.booking_link,
      },
      guests: guests.map((guest) => ({
        uuid: guest.uuid,
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        has_booking: guest.bookings && guest.bookings.length > 0,
        bookings: guest.bookings?.map((b) => ({
          reference: b.booking_reference,
          status: b.status,
          check_in: b.check_in_date,
          check_out: b.check_out_date,
          total_amount: b.total_amount,
        })),
      })),
      total_guests: guests.length,
    };
  }

  /**
   * Get room availability for a wedding group
   */
  async getWeddingRooms(bookingLink: string) {
    const wedding = await this.weddingGroupsRepository.findOne({
      where: { booking_link: bookingLink },
      include: [
        {
          model: Hotels,
          as: 'hotel',
          attributes: ['uuid', 'name'],
        },
      ],
    });

    if (!wedding) {
      throw new NotFoundException('Wedding not found');
    }

    const roomBlocks = await this.roomBlocksRepository.findAll({
      where: { wedding_group_id: wedding.id },
      include: [
        {
          model: RoomTypes,
          as: 'room_type',
          attributes: ['uuid', 'name', 'description', 'max_occupancy'],
        },
      ],
    });

    return {
      wedding: {
        uuid: wedding.uuid,
        name: wedding.name,
        hotel: wedding.hotel
          ? {
              uuid: wedding.hotel.uuid,
              name: wedding.hotel.name,
            }
          : null,
      },
      rooms: roomBlocks.map((block) => ({
        uuid: block.uuid,
        room_type: block.room_type?.name,
        price_per_night: block.price_per_night,
        rooms_allocated: block.rooms_allocated,
        rooms_booked: block.rooms_booked,
        rooms_available: block.rooms_allocated - block.rooms_booked,
        availability_percentage:
          block.rooms_allocated > 0
            ? (
                ((block.rooms_allocated - block.rooms_booked) /
                  block.rooms_allocated) *
                100
              ).toFixed(1)
            : 0,
      })),
    };
  }

  /**
   * Format booking data for external API response
   */
  private formatBookingForExternal(booking: Bookings, detailed = false) {
    const base = {
      uuid: booking.uuid,
      reference: booking.booking_reference,
      status: booking.status,
      guest: booking.guest
        ? {
            uuid: booking.guest.uuid,
            name: booking.guest.name,
            email: booking.guest.email,
            phone: booking.guest.phone,
          }
        : null,
      wedding: booking.wedding_group
        ? {
            uuid: booking.wedding_group.uuid,
            name: booking.wedding_group.name,
            booking_link: booking.wedding_group.booking_link,
            timezone: booking.wedding_group.timezone,
            hotel: booking.wedding_group.hotel
              ? {
                  uuid: booking.wedding_group.hotel.uuid,
                  name: booking.wedding_group.hotel.name,
                }
              : null,
          }
        : null,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      total_nights: booking.total_nights,
      total_rooms: booking.total_rooms,
      amounts: {
        total: booking.total_amount,
        deposit: booking.deposit_amount,
        final: booking.final_amount,
        currency: booking.currency,
      },
      created_at: booking.created_at,
    };

    if (detailed && booking.booking_rooms) {
      return {
        ...base,
        rooms: booking.booking_rooms.map((room) => ({
          room_type: room.room_block?.room_type?.name,
          quantity: room.quantity,
          price_per_night: room.price_per_night,
          subtotal: room.subtotal,
        })),
        special_requests: booking.special_requests,
      };
    }

    return base;
  }
}
