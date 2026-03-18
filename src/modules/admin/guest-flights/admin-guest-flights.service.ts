/**
 * ============================================
 * ADMIN GUEST FLIGHTS SERVICE
 * ============================================
 *
 * Admin service for managing guest flights and airport transfers.
 * Uses repository abstraction to support both Sequelize and Supabase.
 *
 * GP-009: Flights & Transfers - Admin Side
 */

import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  IGuestFlightsRepository,
  GUEST_FLIGHTS_REPOSITORY,
  GuestFlightEntity,
  GuestFlightStats,
  GuestFlightListResult,
} from 'src/core/repositories/guest-flights.repository.interface';
import { FlightQueryDto, UpdateTransferDto, AdminUpdateFlightDto } from './dto';

@Injectable()
export class AdminGuestFlightsService {
  constructor(
    @Inject(GUEST_FLIGHTS_REPOSITORY)
    private readonly guestFlightsRepository: IGuestFlightsRepository,
  ) {}

  /**
   * Get all flights with filters and pagination
   * @param query - Query parameters
   * @param filterAdminId - Admin ID for data-level filtering (null = full access)
   */
  async findAll(query: FlightQueryDto, filterAdminId: number | null = null) {
    console.log('🔍 AdminGuestFlightsService.findAll called with:', query, 'filterAdminId:', filterAdminId);
    const {
      page = 1,
      limit = 20,
      group_uuid,
      transfer_status,
      arrival_date,
      departure_date,
      needs_arrival_transfer,
      needs_departure_transfer,
      search,
    } = query;

    // If group_uuid provided, use findByWeddingGroup
    if (group_uuid) {
      const result = await this.guestFlightsRepository.findByWeddingGroup(group_uuid, {
        page,
        limit,
        transfer_status,
        arrival_date,
        departure_date,
        needs_arrival_transfer,
        needs_departure_transfer,
        search,
        filterAdminId,
      });

      return {
        flights: result.flights,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit),
        },
      };
    }

    // Otherwise, use findAll
    const result = await this.guestFlightsRepository.findAll({
      page,
      limit,
      transfer_status,
      arrival_date,
      departure_date,
      needs_arrival_transfer,
      needs_departure_transfer,
      search,
      filterAdminId,
    });

    console.log('🔍 AdminGuestFlightsService.findAll result:', {
      flightsCount: result.flights.length,
      total: result.total,
    });

    return {
      flights: result.flights,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  /**
   * Get flights for a specific wedding group
   * @param filterAdminId - Admin ID for data-level filtering (null = full access)
   */
  async findByWeddingGroup(groupUuid: string, query: FlightQueryDto, filterAdminId: number | null = null) {
    const result = await this.guestFlightsRepository.findByWeddingGroup(groupUuid, {
      page: query.page,
      limit: query.limit,
      transfer_status: query.transfer_status,
      arrival_date: query.arrival_date,
      departure_date: query.departure_date,
      needs_arrival_transfer: query.needs_arrival_transfer,
      needs_departure_transfer: query.needs_departure_transfer,
      search: query.search,
      filterAdminId,
    });

    if (result.flights.length === 0 && result.total === 0) {
      // Check if group exists by trying to get stats
      const stats = await this.guestFlightsRepository.getGroupStats(groupUuid, filterAdminId);
      // If we get empty stats, the group might not exist or has no flights
    }

    return {
      flights: result.flights,
      pagination: {
        total: result.total,
        page: query.page || 1,
        limit: query.limit || 20,
        totalPages: Math.ceil(result.total / (query.limit || 20)),
      },
    };
  }

  /**
   * Get flight statistics for a wedding group
   * @param filterAdminId - Admin ID for data-level filtering (null = full access)
   */
  async getGroupStats(groupUuid: string, filterAdminId: number | null = null): Promise<GuestFlightStats> {
    return await this.guestFlightsRepository.getGroupStats(groupUuid, filterAdminId);
  }

  /**
   * Get global flight statistics across all accessible groups
   * @param filterAdminId - Admin ID for data-level filtering (null = full access)
   */
  async getGlobalStats(filterAdminId: number | null = null): Promise<GuestFlightStats> {
    return await this.guestFlightsRepository.getGlobalStats(filterAdminId);
  }

  /**
   * Get single flight by UUID
   */
  async findOne(uuid: string): Promise<GuestFlightEntity> {
    const flight = await this.guestFlightsRepository.findByUuid(uuid);

    if (!flight) {
      throw new NotFoundException('Flight details not found');
    }

    return flight;
  }

  /**
   * Update transfer status (admin only)
   */
  async updateTransferStatus(uuid: string, dto: UpdateTransferDto): Promise<GuestFlightEntity> {
    const existingFlight = await this.guestFlightsRepository.findByUuid(uuid);

    if (!existingFlight) {
      throw new NotFoundException('Flight details not found');
    }

    const updateData: any = {};
    if (dto.arrival_transfer_status) {
      updateData.arrival_transfer_status = dto.arrival_transfer_status;
    }
    if (dto.departure_transfer_status) {
      updateData.departure_transfer_status = dto.departure_transfer_status;
    }
    if (dto.admin_notes !== undefined) {
      updateData.admin_notes = dto.admin_notes;
    }

    await this.guestFlightsRepository.update(uuid, updateData);

    return this.findOne(uuid);
  }

  /**
   * Update ALL flight details (admin only)
   * Admin can edit any field - no restrictions on lock period or booking status
   */
  async updateFlightDetails(uuid: string, dto: AdminUpdateFlightDto): Promise<GuestFlightEntity> {
    const existingFlight = await this.guestFlightsRepository.findByUuid(uuid);

    if (!existingFlight) {
      throw new NotFoundException('Flight details not found');
    }

    // Build update data - only include fields that are provided
    const updateData: any = {};

    // Arrival flight details
    if (dto.arrival_airline !== undefined) updateData.arrival_airline = dto.arrival_airline;
    if (dto.arrival_flight_number !== undefined) updateData.arrival_flight_number = dto.arrival_flight_number;
    if (dto.arrival_date !== undefined) updateData.arrival_date = dto.arrival_date;
    if (dto.arrival_time !== undefined) updateData.arrival_time = dto.arrival_time;
    if (dto.arrival_airport !== undefined) updateData.arrival_airport = dto.arrival_airport;
    if (dto.arrival_terminal !== undefined) updateData.arrival_terminal = dto.arrival_terminal;

    // Departure flight details
    if (dto.departure_airline !== undefined) updateData.departure_airline = dto.departure_airline;
    if (dto.departure_flight_number !== undefined) updateData.departure_flight_number = dto.departure_flight_number;
    if (dto.departure_date !== undefined) updateData.departure_date = dto.departure_date;
    if (dto.departure_time !== undefined) updateData.departure_time = dto.departure_time;
    if (dto.departure_airport !== undefined) updateData.departure_airport = dto.departure_airport;
    if (dto.departure_terminal !== undefined) updateData.departure_terminal = dto.departure_terminal;

    // Transfer requirements
    if (dto.needs_arrival_transfer !== undefined) updateData.needs_arrival_transfer = dto.needs_arrival_transfer;
    if (dto.needs_departure_transfer !== undefined) updateData.needs_departure_transfer = dto.needs_departure_transfer;
    if (dto.passengers_count !== undefined) updateData.passengers_count = dto.passengers_count;
    if (dto.transfer_notes !== undefined) updateData.transfer_notes = dto.transfer_notes;

    // Transfer status
    if (dto.arrival_transfer_status !== undefined) updateData.arrival_transfer_status = dto.arrival_transfer_status;
    if (dto.departure_transfer_status !== undefined) updateData.departure_transfer_status = dto.departure_transfer_status;
    if (dto.admin_notes !== undefined) updateData.admin_notes = dto.admin_notes;

    // Auto-set transfer status based on needs_transfer changes
    if (dto.needs_arrival_transfer === false && existingFlight.needs_arrival_transfer === true) {
      updateData.arrival_transfer_status = 'not_needed';
    } else if (dto.needs_arrival_transfer === true && existingFlight.needs_arrival_transfer === false) {
      updateData.arrival_transfer_status = 'pending';
    }

    if (dto.needs_departure_transfer === false && existingFlight.needs_departure_transfer === true) {
      updateData.departure_transfer_status = 'not_needed';
    } else if (dto.needs_departure_transfer === true && existingFlight.needs_departure_transfer === false) {
      updateData.departure_transfer_status = 'pending';
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No update data provided');
    }

    await this.guestFlightsRepository.update(uuid, updateData);

    return this.findOne(uuid);
  }

  /**
   * Bulk update transfer status
   */
  async bulkUpdateTransferStatus(uuids: string[], dto: UpdateTransferDto) {
    const updateData: any = {};

    if (dto.arrival_transfer_status) {
      updateData.arrival_transfer_status = dto.arrival_transfer_status;
    }
    if (dto.departure_transfer_status) {
      updateData.departure_transfer_status = dto.departure_transfer_status;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No update data provided');
    }

    const updatedCount = await this.guestFlightsRepository.bulkUpdateTransferStatus(uuids, updateData);

    return {
      updated_count: updatedCount,
      message: `${updatedCount} flight record(s) updated`,
    };
  }

  /**
   * Export flights for a wedding group (for transport coordination)
   */
  async exportGroupFlights(groupUuid: string) {
    const flights = await this.guestFlightsRepository.exportByWeddingGroup(groupUuid);

    // Format for export
    return flights.map(flight => ({
      guest_name: flight.guest?.name || '',
      guest_email: flight.guest?.email,
      guest_phone: flight.guest?.phone,
      booking_reference: flight.booking?.booking_reference,
      // Arrival
      arrival_airline: flight.arrival_airline,
      arrival_flight_number: flight.arrival_flight_number,
      arrival_date: flight.arrival_date,
      arrival_time: flight.arrival_time,
      arrival_airport: flight.arrival_airport,
      arrival_terminal: flight.arrival_terminal,
      needs_arrival_transfer: flight.needs_arrival_transfer,
      arrival_transfer_status: flight.arrival_transfer_status,
      // Departure
      departure_airline: flight.departure_airline,
      departure_flight_number: flight.departure_flight_number,
      departure_date: flight.departure_date,
      departure_time: flight.departure_time,
      departure_airport: flight.departure_airport,
      departure_terminal: flight.departure_terminal,
      needs_departure_transfer: flight.needs_departure_transfer,
      departure_transfer_status: flight.departure_transfer_status,
      // Other
      passengers_count: flight.passengers_count,
      transfer_notes: flight.transfer_notes,
      admin_notes: flight.admin_notes,
    }));
  }
}
