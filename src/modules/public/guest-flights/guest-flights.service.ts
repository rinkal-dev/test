/**
 * ============================================
 * GUEST FLIGHTS SERVICE (Guest Portal)
 * ============================================
 *
 * Service for managing guest flight details from guest portal.
 * Uses repository abstraction to support both Sequelize and Supabase.
 *
 * GP-009: Flights & Transfers - Guest Side
 * FL-LOCK: Lock period feature to prevent last-minute changes
 */

import { Injectable, Inject, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import {
  IGuestFlightsRepository,
  GUEST_FLIGHTS_REPOSITORY,
  GuestFlightEntity,
  UpdateGuestFlightData,
} from '../../../core/repositories/guest-flights.repository.interface';
import { CreateGuestFlightDto, UpdateGuestFlightDto } from './dto';
import { FlightChangeNotificationService } from './flight-change-notification.service';

// ===================== FL-LOCK CONFIGURATION =====================
// Lock period: Block guest edits within this many hours of travel
const LOCK_PERIOD_HOURS = 24;
// Warning period: Flag as urgent within this many hours of travel
const WARNING_PERIOD_HOURS = 48;

// Critical fields that affect transfer arrangements
const ARRIVAL_CRITICAL_FIELDS = [
  'arrival_airline',
  'arrival_flight_number',
  'arrival_date',
  'arrival_time',
  'arrival_airport',
];

const DEPARTURE_CRITICAL_FIELDS = [
  'departure_airline',
  'departure_flight_number',
  'departure_date',
  'departure_time',
  'departure_airport',
];

/**
 * Calculate hours until a specific date/time
 * Returns null if date is not provided
 */
function getHoursUntilTravel(date?: string, time?: string): number | null {
  if (!date) return null;

  const now = new Date();
  let travelDateTime: Date;

  if (time) {
    // Combine date and time
    travelDateTime = new Date(`${date}T${time}`);
  } else {
    // Assume start of day if no time provided
    travelDateTime = new Date(`${date}T00:00:00`);
  }

  const diffMs = travelDateTime.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  return diffHours;
}

@Injectable()
export class GuestFlightsService {
  private readonly logger = new Logger(GuestFlightsService.name);

  constructor(
    @Inject(GUEST_FLIGHTS_REPOSITORY)
    private readonly guestFlightsRepository: IGuestFlightsRepository,
    private readonly flightChangeNotificationService: FlightChangeNotificationService,
  ) {}

  /**
   * Get flight details for a booking
   * Used by guest to view their saved flight info
   */
  async getFlightByBooking(bookingUuid: string, guestId: number): Promise<GuestFlightEntity | null> {
    const flight = await this.guestFlightsRepository.findByBookingUuid(bookingUuid, guestId);
    return flight;
  }

  /**
   * Create or update flight details for a booking
   * Used by guest to save their flight info
   *
   * Auto-resets transfer status to 'pending' if critical fields change
   * and notifies admin of the changes.
   */
  async saveFlightDetails(
    bookingUuid: string,
    guestId: number,
    dto: CreateGuestFlightDto,
  ): Promise<GuestFlightEntity> {
    // Get booking ID from uuid
    const bookingInfo = await this.guestFlightsRepository.getBookingAndGuestIds(bookingUuid, guestId);

    if (!bookingInfo) {
      throw new NotFoundException('Booking not found or you do not have access');
    }

    // Block flight edits for cancelled/failed bookings
    if (['cancelled', 'failed'].includes(bookingInfo.status)) {
      throw new ForbiddenException('Cannot update flight details for a cancelled booking');
    }

    // Check if this is an update (existing flight record)
    const existingFlight = await this.guestFlightsRepository.findByBookingUuid(bookingUuid, guestId);
    const isUpdate = !!existingFlight;

    // ===================== FL-LOCK: Lock Period Check =====================
    // Only check lock period for updates (not new entries)
    let isUrgentChange = false;
    if (isUpdate && existingFlight) {
      // Check arrival lock period (if arrival details are being changed)
      const hoursUntilArrival = getHoursUntilTravel(
        existingFlight.arrival_date,
        existingFlight.arrival_time,
      );

      // Check departure lock period (if departure details are being changed)
      const hoursUntilDeparture = getHoursUntilTravel(
        existingFlight.departure_date,
        existingFlight.departure_time,
      );

      // Check if arrival fields are being modified
      const isModifyingArrival = ARRIVAL_CRITICAL_FIELDS.some(field => {
        const oldVal = existingFlight[field as keyof GuestFlightEntity];
        const newVal = dto[field as keyof CreateGuestFlightDto];
        return oldVal !== newVal && (oldVal || newVal);
      });

      // Check if departure fields are being modified
      const isModifyingDeparture = DEPARTURE_CRITICAL_FIELDS.some(field => {
        const oldVal = existingFlight[field as keyof GuestFlightEntity];
        const newVal = dto[field as keyof CreateGuestFlightDto];
        return oldVal !== newVal && (oldVal || newVal);
      });

      // Block if modifying arrival within lock period
      if (isModifyingArrival && hoursUntilArrival !== null && hoursUntilArrival < LOCK_PERIOD_HOURS && hoursUntilArrival > 0) {
        throw new ForbiddenException(
          `Cannot modify arrival flight details within ${LOCK_PERIOD_HOURS} hours of travel. Please contact admin to make changes.`,
        );
      }

      // Block if modifying departure within lock period
      if (isModifyingDeparture && hoursUntilDeparture !== null && hoursUntilDeparture < LOCK_PERIOD_HOURS && hoursUntilDeparture > 0) {
        throw new ForbiddenException(
          `Cannot modify departure flight details within ${LOCK_PERIOD_HOURS} hours of travel. Please contact admin to make changes.`,
        );
      }

      // Flag as urgent if within warning period (24-48 hours)
      if (
        (isModifyingArrival && hoursUntilArrival !== null && hoursUntilArrival < WARNING_PERIOD_HOURS && hoursUntilArrival >= LOCK_PERIOD_HOURS) ||
        (isModifyingDeparture && hoursUntilDeparture !== null && hoursUntilDeparture < WARNING_PERIOD_HOURS && hoursUntilDeparture >= LOCK_PERIOD_HOURS)
      ) {
        isUrgentChange = true;
        this.logger.warn(`URGENT: Guest modifying flight details within ${WARNING_PERIOD_HOURS} hours of travel`);
      }
    }

    // Prepare flight data
    const flightData: any = {
      booking_id: bookingInfo.bookingId,
      guest_id: bookingInfo.guestId,
      arrival_airline: dto.arrival_airline,
      arrival_flight_number: dto.arrival_flight_number,
      arrival_date: dto.arrival_date,
      arrival_time: dto.arrival_time,
      arrival_airport: dto.arrival_airport,
      arrival_terminal: dto.arrival_terminal,
      departure_airline: dto.departure_airline,
      departure_flight_number: dto.departure_flight_number,
      departure_date: dto.departure_date,
      departure_time: dto.departure_time,
      departure_airport: dto.departure_airport,
      departure_terminal: dto.departure_terminal,
      needs_arrival_transfer: dto.needs_arrival_transfer,
      needs_departure_transfer: dto.needs_departure_transfer,
      passengers_count: dto.passengers_count,
      transfer_notes: dto.transfer_notes,
    };

    // Track changes and determine if status should be reset
    const changes: { field: string; oldValue: any; newValue: any }[] = [];
    let resetArrivalStatus = false;
    let resetDepartureStatus = false;

    if (isUpdate && existingFlight) {
      // Check for critical arrival field changes
      if (existingFlight.arrival_transfer_status === 'confirmed') {
        for (const field of ARRIVAL_CRITICAL_FIELDS) {
          const oldVal = existingFlight[field as keyof GuestFlightEntity];
          const newVal = dto[field as keyof CreateGuestFlightDto];
          if (oldVal !== newVal && (oldVal || newVal)) {
            changes.push({ field, oldValue: oldVal, newValue: newVal });
            resetArrivalStatus = true;
          }
        }
      }

      // Check for critical departure field changes
      if (existingFlight.departure_transfer_status === 'confirmed') {
        for (const field of DEPARTURE_CRITICAL_FIELDS) {
          const oldVal = existingFlight[field as keyof GuestFlightEntity];
          const newVal = dto[field as keyof CreateGuestFlightDto];
          if (oldVal !== newVal && (oldVal || newVal)) {
            changes.push({ field, oldValue: oldVal, newValue: newVal });
            resetDepartureStatus = true;
          }
        }
      }

      // Handle transfer toggle changes
      if (dto.needs_arrival_transfer === false && existingFlight.needs_arrival_transfer === true) {
        flightData.arrival_transfer_status = 'not_needed';
        changes.push({ field: 'needs_arrival_transfer', oldValue: true, newValue: false });
      } else if (dto.needs_arrival_transfer === true && existingFlight.needs_arrival_transfer === false) {
        flightData.arrival_transfer_status = 'pending';
        changes.push({ field: 'needs_arrival_transfer', oldValue: false, newValue: true });
      } else if (resetArrivalStatus) {
        flightData.arrival_transfer_status = 'pending';
        this.logger.log(`Resetting arrival transfer status to pending due to critical field changes`);
      }

      if (dto.needs_departure_transfer === false && existingFlight.needs_departure_transfer === true) {
        flightData.departure_transfer_status = 'not_needed';
        changes.push({ field: 'needs_departure_transfer', oldValue: true, newValue: false });
      } else if (dto.needs_departure_transfer === true && existingFlight.needs_departure_transfer === false) {
        flightData.departure_transfer_status = 'pending';
        changes.push({ field: 'needs_departure_transfer', oldValue: false, newValue: true });
      } else if (resetDepartureStatus) {
        flightData.departure_transfer_status = 'pending';
        this.logger.log(`Resetting departure transfer status to pending due to critical field changes`);
      }
    }

    // Upsert flight details
    const flight = await this.guestFlightsRepository.upsertByBooking(
      bookingInfo.bookingId,
      bookingInfo.guestId,
      flightData,
    );

    // Send notification to admin if this was an update with status changes
    if (isUpdate && changes.length > 0 && (resetArrivalStatus || resetDepartureStatus)) {
      try {
        await this.flightChangeNotificationService.notifyAdminOfFlightChange({
          flightUuid: flight.uuid,
          bookingUuid,
          guestName: existingFlight?.guest?.name || 'Guest',
          guestEmail: existingFlight?.guest?.email || '',
          bookingReference: existingFlight?.booking?.booking_reference || '',
          weddingGroupName: existingFlight?.booking?.wedding_group?.name || '',
          changes,
          arrivalStatusReset: resetArrivalStatus,
          departureStatusReset: resetDepartureStatus,
          previousArrivalStatus: existingFlight?.arrival_transfer_status,
          previousDepartureStatus: existingFlight?.departure_transfer_status,
          isUrgent: isUrgentChange, // FL-LOCK: Flag for changes within warning period
        });
      } catch (error) {
        this.logger.error(`Failed to send flight change notification: ${error.message}`);
        // Don't fail the save operation if notification fails
      }
    }

    return flight;
  }

  /**
   * Delete flight details for a booking
   */
  async deleteFlightDetails(bookingUuid: string, guestId: number): Promise<boolean> {
    // Check booking status before allowing delete
    const bookingInfo = await this.guestFlightsRepository.getBookingAndGuestIds(bookingUuid, guestId);

    if (!bookingInfo) {
      throw new NotFoundException('Booking not found or you do not have access');
    }

    // Block flight deletion for cancelled/failed bookings
    if (['cancelled', 'failed'].includes(bookingInfo.status)) {
      throw new ForbiddenException('Cannot delete flight details for a cancelled booking');
    }

    // ===================== FL-LOCK: Check lock period before delete =====================
    const existingFlight = await this.guestFlightsRepository.findByBookingUuid(bookingUuid, guestId);
    if (existingFlight) {
      const hoursUntilArrival = getHoursUntilTravel(existingFlight.arrival_date, existingFlight.arrival_time);
      const hoursUntilDeparture = getHoursUntilTravel(existingFlight.departure_date, existingFlight.departure_time);

      // Block if within lock period of either flight
      if (
        (hoursUntilArrival !== null && hoursUntilArrival < LOCK_PERIOD_HOURS && hoursUntilArrival > 0) ||
        (hoursUntilDeparture !== null && hoursUntilDeparture < LOCK_PERIOD_HOURS && hoursUntilDeparture > 0)
      ) {
        throw new ForbiddenException(
          `Cannot delete flight details within ${LOCK_PERIOD_HOURS} hours of travel. Please contact admin to make changes.`,
        );
      }
    }

    return await this.guestFlightsRepository.deleteByBookingUuid(bookingUuid, guestId);
  }

  /**
   * Get flight details by UUID (for admin)
   */
  async getFlightByUuid(uuid: string): Promise<GuestFlightEntity> {
    const flight = await this.guestFlightsRepository.findByUuid(uuid);

    if (!flight) {
      throw new NotFoundException('Flight details not found');
    }

    return flight;
  }
}
