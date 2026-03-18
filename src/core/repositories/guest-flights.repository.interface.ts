/**
 * ============================================
 * GUEST FLIGHTS REPOSITORY INTERFACE
 * ============================================
 *
 * Domain-specific repository interface for guest flight management.
 * Handles flight details and airport transfer coordination.
 *
 * Services use ONLY this interface, never the implementation.
 * This allows switching database providers without changing services.
 */

// ============================================
// ENTITY TYPES (Provider-agnostic)
// ============================================

export interface GuestFlightGuestEntity {
  id: number;
  uuid: string;
  name: string;
  email: string;
  phone?: string;
}

export interface GuestFlightBookingEntity {
  id: number;
  uuid: string;
  booking_reference: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  wedding_group?: {
    id: number;
    uuid: string;
    name: string;
    bride_name?: string;
    groom_name?: string;
    created_by?: number; // For data-level ownership filtering
  };
}

export interface GuestFlightEntity {
  id: number;
  uuid: string;
  booking_id: number;
  guest_id: number;

  // Arrival
  arrival_airline?: string;
  arrival_flight_number?: string;
  arrival_date?: string;
  arrival_time?: string;
  arrival_airport?: string;
  arrival_terminal?: string;

  // Departure
  departure_airline?: string;
  departure_flight_number?: string;
  departure_date?: string;
  departure_time?: string;
  departure_airport?: string;
  departure_terminal?: string;

  // Transfer
  needs_arrival_transfer?: boolean;
  needs_departure_transfer?: boolean;
  passengers_count?: number;
  transfer_notes?: string;

  // Admin fields
  arrival_transfer_status?: 'pending' | 'confirmed' | 'not_needed' | 'cancelled';
  departure_transfer_status?: 'pending' | 'confirmed' | 'not_needed' | 'cancelled';
  admin_notes?: string;

  created_at?: string;
  updated_at?: string;

  // Relations
  guest?: GuestFlightGuestEntity;
  booking?: GuestFlightBookingEntity;
}

export interface CreateGuestFlightData {
  booking_id: number;
  guest_id: number;
  arrival_airline?: string;
  arrival_flight_number?: string;
  arrival_date?: string;
  arrival_time?: string;
  arrival_airport?: string;
  arrival_terminal?: string;
  departure_airline?: string;
  departure_flight_number?: string;
  departure_date?: string;
  departure_time?: string;
  departure_airport?: string;
  departure_terminal?: string;
  needs_arrival_transfer?: boolean;
  needs_departure_transfer?: boolean;
  passengers_count?: number;
  transfer_notes?: string;
}

export interface UpdateGuestFlightData extends Partial<CreateGuestFlightData> {
  arrival_transfer_status?: 'pending' | 'confirmed' | 'not_needed' | 'cancelled';
  departure_transfer_status?: 'pending' | 'confirmed' | 'not_needed' | 'cancelled';
  admin_notes?: string;
}

export interface GuestFlightQueryParams {
  page?: number;
  limit?: number;
  group_uuid?: string;
  transfer_status?: string;
  arrival_date?: string;
  departure_date?: string;
  needs_arrival_transfer?: boolean;
  needs_departure_transfer?: boolean;
  search?: string;
  filterAdminId?: number | null; // For data-level filtering (null = no filter, number = filter by created_by)
}

export interface GuestFlightListResult {
  flights: GuestFlightEntity[];
  total: number;
}

export interface GuestFlightStats {
  total_flights: number;
  transfers: {
    arrival: {
      needing: number;
      pending: number;
      confirmed: number;
    };
    departure: {
      needing: number;
      pending: number;
      confirmed: number;
    };
  };
  arrivals_by_date: Array<{ arrival_date: string; count: number }>;
  departures_by_date: Array<{ departure_date: string; count: number }>;
}

// ============================================
// REPOSITORY INTERFACE
// ============================================

export interface IGuestFlightsRepository {
  /**
   * Find flight by booking UUID (for guest access)
   */
  findByBookingUuid(bookingUuid: string, guestId: number): Promise<GuestFlightEntity | null>;

  /**
   * Find flight by UUID
   */
  findByUuid(uuid: string): Promise<GuestFlightEntity | null>;

  /**
   * Find all flights with filters and pagination (admin)
   * @param params - Query parameters including filterAdminId for data-level filtering
   */
  findAll(params: GuestFlightQueryParams): Promise<GuestFlightListResult>;

  /**
   * Find flights by wedding group UUID
   * @param params - Query parameters including filterAdminId for data-level filtering
   */
  findByWeddingGroup(groupUuid: string, params: GuestFlightQueryParams): Promise<GuestFlightListResult>;

  /**
   * Get flight statistics for a wedding group
   * @param filterAdminId - Admin ID for data-level filtering (null = no filter)
   */
  getGroupStats(groupUuid: string, filterAdminId?: number | null): Promise<GuestFlightStats>;

  /**
   * Get global flight statistics (across all groups user has access to)
   * @param filterAdminId - Admin ID for data-level filtering (null = no filter)
   */
  getGlobalStats(filterAdminId?: number | null): Promise<GuestFlightStats>;

  /**
   * Create or update flight details (upsert by booking_id)
   */
  upsertByBooking(bookingId: number, guestId: number, data: CreateGuestFlightData): Promise<GuestFlightEntity>;

  /**
   * Update flight details by UUID
   */
  update(uuid: string, data: UpdateGuestFlightData): Promise<GuestFlightEntity>;

  /**
   * Bulk update transfer status
   */
  bulkUpdateTransferStatus(uuids: string[], data: UpdateGuestFlightData): Promise<number>;

  /**
   * Delete flight by booking UUID (guest)
   */
  deleteByBookingUuid(bookingUuid: string, guestId: number): Promise<boolean>;

  /**
   * Get booking ID, Guest ID, and status from booking UUID (helper)
   */
  getBookingAndGuestIds(bookingUuid: string, guestId: number): Promise<{ bookingId: number; guestId: number; status: string } | null>;

  /**
   * Export flights for a wedding group
   */
  exportByWeddingGroup(groupUuid: string): Promise<GuestFlightEntity[]>;
}

/**
 * Repository token for dependency injection
 */
export const GUEST_FLIGHTS_REPOSITORY = 'GUEST_FLIGHTS_REPOSITORY';
