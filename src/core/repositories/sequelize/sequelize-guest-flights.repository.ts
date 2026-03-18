/**
 * ============================================
 * SEQUELIZE GUEST FLIGHTS REPOSITORY
 * ============================================
 *
 * Sequelize implementation of the guest flights repository.
 * Uses Sequelize ORM to interact with PostgreSQL database.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import {
  IGuestFlightsRepository,
  GuestFlightEntity,
  GuestFlightQueryParams,
  GuestFlightListResult,
  GuestFlightStats,
  CreateGuestFlightData,
  UpdateGuestFlightData,
} from '../guest-flights.repository.interface';
import { GuestFlights } from 'src/models/GuestFlights';
import { Bookings } from 'src/models/Bookings';
import { Guests } from 'src/models/Guests';
import { WeddingGroups } from 'src/models/WeddingGroups';

@Injectable()
export class SequelizeGuestFlightsRepository implements IGuestFlightsRepository {
  constructor(
    @Inject('GUEST_FLIGHTS_MODEL') private guestFlightsModel: typeof GuestFlights,
    @Inject('BOOKINGS_MODEL') private bookingsModel: typeof Bookings,
    @Inject('GUESTS_MODEL') private guestsModel: typeof Guests,
    @Inject('WEDDING_GROUPS_MODEL') private weddingGroupsModel: typeof WeddingGroups,
  ) {}

  async findByBookingUuid(bookingUuid: string, guestId: number): Promise<GuestFlightEntity | null> {
    const booking = await this.bookingsModel.findOne({
      where: { uuid: bookingUuid, guest_id: guestId },
      attributes: ['id'],
    });

    if (!booking) return null;

    const flight = await this.guestFlightsModel.findOne({
      where: { booking_id: booking.id },
    });

    return flight ? (flight.toJSON() as GuestFlightEntity) : null;
  }

  async findByUuid(uuid: string): Promise<GuestFlightEntity | null> {
    const flight = await this.guestFlightsModel.findOne({
      where: { uuid },
      include: [
        {
          model: this.bookingsModel,
          as: 'booking',
          attributes: ['id', 'uuid', 'booking_reference', 'check_in_date', 'check_out_date', 'status'],
          include: [
            {
              model: this.weddingGroupsModel,
              as: 'wedding_group',
              attributes: ['id', 'uuid', 'name', 'bride_name', 'groom_name', 'created_by'],
            },
          ],
        },
        {
          model: this.guestsModel,
          as: 'guest',
          attributes: ['id', 'uuid', 'name', 'email', 'phone'],
        },
      ],
    });

    return flight ? (flight.toJSON() as GuestFlightEntity) : null;
  }

  async findAll(params: GuestFlightQueryParams): Promise<GuestFlightListResult> {
    const { page = 1, limit = 20, transfer_status, arrival_date, departure_date, needs_arrival_transfer, needs_departure_transfer, search, filterAdminId } = params;
    const offset = (page - 1) * limit;

    const flightWhere: any = {};

    if (transfer_status) {
      flightWhere[Op.or] = [
        { arrival_transfer_status: transfer_status },
        { departure_transfer_status: transfer_status },
      ];
    }

    if (arrival_date) flightWhere.arrival_date = arrival_date;
    if (departure_date) flightWhere.departure_date = departure_date;
    if (needs_arrival_transfer !== undefined) flightWhere.needs_arrival_transfer = needs_arrival_transfer;
    if (needs_departure_transfer !== undefined) flightWhere.needs_departure_transfer = needs_departure_transfer;

    if (search) {
      flightWhere[Op.or] = [
        { arrival_flight_number: { [Op.iLike]: `%${search}%` } },
        { departure_flight_number: { [Op.iLike]: `%${search}%` } },
        { arrival_airline: { [Op.iLike]: `%${search}%` } },
        { departure_airline: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Build wedding group where clause for data filtering
    const weddingGroupWhere: any = {};
    if (filterAdminId !== null && filterAdminId !== undefined) {
      weddingGroupWhere.created_by = filterAdminId;
    }

    const { rows, count } = await this.guestFlightsModel.findAndCountAll({
      where: flightWhere,
      include: [
        {
          model: this.bookingsModel,
          as: 'booking',
          attributes: ['id', 'uuid', 'booking_reference', 'check_in_date', 'check_out_date', 'status'],
          // Exclude cancelled/failed bookings from flight listings
          where: { status: { [Op.notIn]: ['cancelled', 'failed'] } },
          include: [
            {
              model: this.weddingGroupsModel,
              as: 'wedding_group',
              attributes: ['id', 'uuid', 'name', 'bride_name', 'groom_name', 'created_by'],
              where: Object.keys(weddingGroupWhere).length > 0 ? weddingGroupWhere : undefined,
            },
          ],
        },
        {
          model: this.guestsModel,
          as: 'guest',
          attributes: ['id', 'uuid', 'name', 'email', 'phone'],
        },
      ],
      order: [['arrival_date', 'ASC'], ['arrival_time', 'ASC']],
      limit,
      offset,
    });

    return {
      flights: rows.map(r => r.toJSON() as GuestFlightEntity),
      total: count,
    };
  }

  async findByWeddingGroup(groupUuid: string, params: GuestFlightQueryParams): Promise<GuestFlightListResult> {
    const { filterAdminId } = params;

    // Build group where clause with optional data filtering
    const groupWhere: any = { uuid: groupUuid };
    if (filterAdminId !== null && filterAdminId !== undefined) {
      groupWhere.created_by = filterAdminId;
    }

    const group = await this.weddingGroupsModel.findOne({ where: groupWhere });
    if (!group) return { flights: [], total: 0 };

    const { page = 1, limit = 20, transfer_status, arrival_date, departure_date, needs_arrival_transfer, needs_departure_transfer, search } = params;
    const offset = (page - 1) * limit;

    const flightWhere: any = {};

    if (transfer_status) {
      flightWhere[Op.or] = [
        { arrival_transfer_status: transfer_status },
        { departure_transfer_status: transfer_status },
      ];
    }

    if (arrival_date) flightWhere.arrival_date = arrival_date;
    if (departure_date) flightWhere.departure_date = departure_date;
    if (needs_arrival_transfer !== undefined) flightWhere.needs_arrival_transfer = needs_arrival_transfer;
    if (needs_departure_transfer !== undefined) flightWhere.needs_departure_transfer = needs_departure_transfer;

    if (search) {
      flightWhere[Op.or] = [
        { arrival_flight_number: { [Op.iLike]: `%${search}%` } },
        { departure_flight_number: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { rows, count } = await this.guestFlightsModel.findAndCountAll({
      where: flightWhere,
      include: [
        {
          model: this.bookingsModel,
          as: 'booking',
          // Filter by wedding group AND exclude cancelled/failed bookings
          where: {
            wedding_group_id: group.id,
            status: { [Op.notIn]: ['cancelled', 'failed'] },
          },
          attributes: ['id', 'uuid', 'booking_reference', 'check_in_date', 'check_out_date', 'status'],
          include: [
            {
              model: this.weddingGroupsModel,
              as: 'wedding_group',
              attributes: ['id', 'uuid', 'name', 'bride_name', 'groom_name'],
            },
          ],
        },
        {
          model: this.guestsModel,
          as: 'guest',
          attributes: ['id', 'uuid', 'name', 'email', 'phone'],
        },
      ],
      order: [['arrival_date', 'ASC'], ['arrival_time', 'ASC']],
      limit,
      offset,
    });

    return {
      flights: rows.map(r => r.toJSON() as GuestFlightEntity),
      total: count,
    };
  }

  async getGroupStats(groupUuid: string, filterAdminId?: number | null): Promise<GuestFlightStats> {
    // Build group where clause with optional data filtering
    const groupWhere: any = { uuid: groupUuid };
    if (filterAdminId !== null && filterAdminId !== undefined) {
      groupWhere.created_by = filterAdminId;
    }

    const group = await this.weddingGroupsModel.findOne({ where: groupWhere });
    if (!group) {
      return {
        total_flights: 0,
        transfers: {
          arrival: { needing: 0, pending: 0, confirmed: 0 },
          departure: { needing: 0, pending: 0, confirmed: 0 },
        },
        arrivals_by_date: [],
        departures_by_date: [],
      };
    }

    // Exclude cancelled/failed bookings from stats
    const bookings = await this.bookingsModel.findAll({
      where: {
        wedding_group_id: group.id,
        status: { [Op.notIn]: ['cancelled', 'failed'] },
      },
      attributes: ['id'],
    });
    const bookingIds = bookings.map(b => b.id);

    if (bookingIds.length === 0) {
      return {
        total_flights: 0,
        transfers: {
          arrival: { needing: 0, pending: 0, confirmed: 0 },
          departure: { needing: 0, pending: 0, confirmed: 0 },
        },
        arrivals_by_date: [],
        departures_by_date: [],
      };
    }

    const totalFlights = await this.guestFlightsModel.count({
      where: { booking_id: { [Op.in]: bookingIds } },
    });

    const needingArrivalTransfer = await this.guestFlightsModel.count({
      where: { booking_id: { [Op.in]: bookingIds }, needs_arrival_transfer: true },
    });

    const needingDepartureTransfer = await this.guestFlightsModel.count({
      where: { booking_id: { [Op.in]: bookingIds }, needs_departure_transfer: true },
    });

    const pendingArrivalTransfers = await this.guestFlightsModel.count({
      where: { booking_id: { [Op.in]: bookingIds }, needs_arrival_transfer: true, arrival_transfer_status: 'pending' },
    });

    const pendingDepartureTransfers = await this.guestFlightsModel.count({
      where: { booking_id: { [Op.in]: bookingIds }, needs_departure_transfer: true, departure_transfer_status: 'pending' },
    });

    const confirmedArrivalTransfers = await this.guestFlightsModel.count({
      where: { booking_id: { [Op.in]: bookingIds }, arrival_transfer_status: 'confirmed' },
    });

    const confirmedDepartureTransfers = await this.guestFlightsModel.count({
      where: { booking_id: { [Op.in]: bookingIds }, departure_transfer_status: 'confirmed' },
    });

    const arrivalsByDate = await this.guestFlightsModel.findAll({
      where: { booking_id: { [Op.in]: bookingIds }, arrival_date: { [Op.ne]: null } },
      attributes: ['arrival_date', [this.guestFlightsModel.sequelize.fn('COUNT', '*'), 'count']],
      group: ['arrival_date'],
      order: [['arrival_date', 'ASC']],
      raw: true,
    }) as any[];

    const departuresByDate = await this.guestFlightsModel.findAll({
      where: { booking_id: { [Op.in]: bookingIds }, departure_date: { [Op.ne]: null } },
      attributes: ['departure_date', [this.guestFlightsModel.sequelize.fn('COUNT', '*'), 'count']],
      group: ['departure_date'],
      order: [['departure_date', 'ASC']],
      raw: true,
    }) as any[];

    return {
      total_flights: totalFlights,
      transfers: {
        arrival: { needing: needingArrivalTransfer, pending: pendingArrivalTransfers, confirmed: confirmedArrivalTransfers },
        departure: { needing: needingDepartureTransfer, pending: pendingDepartureTransfers, confirmed: confirmedDepartureTransfers },
      },
      arrivals_by_date: arrivalsByDate.map(r => ({ arrival_date: r.arrival_date, count: parseInt(r.count) })),
      departures_by_date: departuresByDate.map(r => ({ departure_date: r.departure_date, count: parseInt(r.count) })),
    };
  }

  async getGlobalStats(filterAdminId?: number | null): Promise<GuestFlightStats> {
    // Build wedding group filter for data-level filtering
    const groupWhere: any = {};
    if (filterAdminId !== null && filterAdminId !== undefined) {
      groupWhere.created_by = filterAdminId;
    }

    // Get all wedding groups user has access to
    const groups = await this.weddingGroupsModel.findAll({
      where: Object.keys(groupWhere).length > 0 ? groupWhere : undefined,
      attributes: ['id'],
    });
    const groupIds = groups.map(g => g.id);

    if (groupIds.length === 0) {
      return {
        total_flights: 0,
        transfers: {
          arrival: { needing: 0, pending: 0, confirmed: 0 },
          departure: { needing: 0, pending: 0, confirmed: 0 },
        },
        arrivals_by_date: [],
        departures_by_date: [],
      };
    }

    // Exclude cancelled/failed bookings from stats
    const bookings = await this.bookingsModel.findAll({
      where: {
        wedding_group_id: { [Op.in]: groupIds },
        status: { [Op.notIn]: ['cancelled', 'failed'] },
      },
      attributes: ['id'],
    });
    const bookingIds = bookings.map(b => b.id);

    if (bookingIds.length === 0) {
      return {
        total_flights: 0,
        transfers: {
          arrival: { needing: 0, pending: 0, confirmed: 0 },
          departure: { needing: 0, pending: 0, confirmed: 0 },
        },
        arrivals_by_date: [],
        departures_by_date: [],
      };
    }

    const totalFlights = await this.guestFlightsModel.count({
      where: { booking_id: { [Op.in]: bookingIds } },
    });

    const needingArrivalTransfer = await this.guestFlightsModel.count({
      where: { booking_id: { [Op.in]: bookingIds }, needs_arrival_transfer: true },
    });

    const needingDepartureTransfer = await this.guestFlightsModel.count({
      where: { booking_id: { [Op.in]: bookingIds }, needs_departure_transfer: true },
    });

    const pendingArrivalTransfers = await this.guestFlightsModel.count({
      where: { booking_id: { [Op.in]: bookingIds }, needs_arrival_transfer: true, arrival_transfer_status: 'pending' },
    });

    const pendingDepartureTransfers = await this.guestFlightsModel.count({
      where: { booking_id: { [Op.in]: bookingIds }, needs_departure_transfer: true, departure_transfer_status: 'pending' },
    });

    const confirmedArrivalTransfers = await this.guestFlightsModel.count({
      where: { booking_id: { [Op.in]: bookingIds }, arrival_transfer_status: 'confirmed' },
    });

    const confirmedDepartureTransfers = await this.guestFlightsModel.count({
      where: { booking_id: { [Op.in]: bookingIds }, departure_transfer_status: 'confirmed' },
    });

    return {
      total_flights: totalFlights,
      transfers: {
        arrival: { needing: needingArrivalTransfer, pending: pendingArrivalTransfers, confirmed: confirmedArrivalTransfers },
        departure: { needing: needingDepartureTransfer, pending: pendingDepartureTransfers, confirmed: confirmedDepartureTransfers },
      },
      arrivals_by_date: [],
      departures_by_date: [],
    };
  }

  async upsertByBooking(bookingId: number, guestId: number, data: CreateGuestFlightData): Promise<GuestFlightEntity> {
    const [flight, created] = await this.guestFlightsModel.findOrCreate({
      where: { booking_id: bookingId },
      defaults: { ...data, uuid: uuidv4(), booking_id: bookingId, guest_id: guestId },
    });

    if (!created) {
      // Update existing record with new data
      await flight.update(data);
      // Reload to get fresh data
      await flight.reload();
    }

    return flight.toJSON() as GuestFlightEntity;
  }

  async update(uuid: string, data: UpdateGuestFlightData): Promise<GuestFlightEntity> {
    const flight = await this.guestFlightsModel.findOne({ where: { uuid } });
    if (!flight) throw new Error('Flight not found');

    await flight.update(data);
    return this.findByUuid(uuid);
  }

  async bulkUpdateTransferStatus(uuids: string[], data: UpdateGuestFlightData): Promise<number> {
    const [updatedCount] = await this.guestFlightsModel.update(data, {
      where: { uuid: { [Op.in]: uuids } },
    });
    return updatedCount;
  }

  async deleteByBookingUuid(bookingUuid: string, guestId: number): Promise<boolean> {
    const booking = await this.bookingsModel.findOne({
      where: { uuid: bookingUuid, guest_id: guestId },
      attributes: ['id'],
    });

    if (!booking) return false;

    const deleted = await this.guestFlightsModel.destroy({
      where: { booking_id: booking.id },
    });

    return deleted > 0;
  }

  async getBookingAndGuestIds(bookingUuid: string, guestId: number): Promise<{ bookingId: number; guestId: number; status: string } | null> {
    const booking = await this.bookingsModel.findOne({
      where: { uuid: bookingUuid, guest_id: guestId },
      attributes: ['id', 'guest_id', 'status'],
    });

    if (!booking) return null;

    return { bookingId: booking.id, guestId: booking.guest_id, status: booking.status };
  }

  async exportByWeddingGroup(groupUuid: string): Promise<GuestFlightEntity[]> {
    const group = await this.weddingGroupsModel.findOne({ where: { uuid: groupUuid } });
    if (!group) return [];

    const flights = await this.guestFlightsModel.findAll({
      include: [
        {
          model: this.bookingsModel,
          as: 'booking',
          // Exclude cancelled/failed bookings from export
          where: {
            wedding_group_id: group.id,
            status: { [Op.notIn]: ['cancelled', 'failed'] },
          },
          attributes: ['booking_reference', 'check_in_date', 'check_out_date', 'status'],
        },
        {
          model: this.guestsModel,
          as: 'guest',
          attributes: ['name', 'email', 'phone'],
        },
      ],
      order: [['arrival_date', 'ASC'], ['arrival_time', 'ASC']],
    });

    return flights.map(f => f.toJSON() as GuestFlightEntity);
  }
}
