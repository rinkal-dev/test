/**
 * ============================================
 * SUPABASE GUEST FLIGHTS REPOSITORY
 * ============================================
 *
 * Supabase-specific implementation of IGuestFlightsRepository.
 * Handles all database operations for guest flights using Supabase.
 *
 * To use:
 * 1. Install: npm install @supabase/supabase-js
 * 2. Set env: DATABASE_PROVIDER=supabase
 * 3. Set env: SUPABASE_URL, SUPABASE_SERVICE_KEY
 * 4. Restart server
 */

import { Injectable } from '@nestjs/common';
import {
  IGuestFlightsRepository,
  GuestFlightEntity,
  GuestFlightQueryParams,
  GuestFlightListResult,
  GuestFlightStats,
  CreateGuestFlightData,
  UpdateGuestFlightData,
} from '../guest-flights.repository.interface';

// Supabase client will be dynamically imported when needed
let supabaseClient: any = null;
let supabaseModule: any = null;

const getSupabaseClient = async () => {
  if (supabaseClient) return supabaseClient;

  try {
    if (!supabaseModule) {
      try {
        supabaseModule = await eval(`import('@supabase/supabase-js')`);
      } catch (importError) {
        throw new Error(
          'Supabase package not installed. Run: npm install @supabase/supabase-js',
        );
      }
    }

    const { createClient } = supabaseModule;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_KEY/SUPABASE_ANON_KEY are required',
      );
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);
    return supabaseClient;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    throw error;
  }
};

@Injectable()
export class SupabaseGuestFlightsRepository implements IGuestFlightsRepository {
  async findByBookingUuid(bookingUuid: string, guestId: number): Promise<GuestFlightEntity | null> {
    const supabase = await getSupabaseClient();

    // First get the booking
    const { data: booking } = await supabase
      .from('bookings')
      .select('id')
      .eq('uuid', bookingUuid)
      .eq('guest_id', guestId)
      .single();

    if (!booking) return null;

    const { data: flight } = await supabase
      .from('guest_flights')
      .select('*')
      .eq('booking_id', booking.id)
      .single();

    return flight || null;
  }

  async findByUuid(uuid: string): Promise<GuestFlightEntity | null> {
    const supabase = await getSupabaseClient();

    const { data: flight } = await supabase
      .from('guest_flights')
      .select(`
        *,
        booking:bookings(id, uuid, booking_reference, check_in_date, check_out_date, status,
          wedding_group:wedding_groups(id, uuid, name, bride_name, groom_name)
        ),
        guest:guests(id, uuid, name, email, phone)
      `)
      .eq('uuid', uuid)
      .single();

    return flight || null;
  }

  async findAll(params: GuestFlightQueryParams): Promise<GuestFlightListResult> {
    const supabase = await getSupabaseClient();
    const { page = 1, limit = 20, transfer_status, arrival_date, departure_date, needs_arrival_transfer, needs_departure_transfer, search } = params;
    const offset = (page - 1) * limit;

    // Use !inner join to exclude cancelled/failed bookings
    let query = supabase
      .from('guest_flights')
      .select(`
        *,
        booking:bookings!inner(id, uuid, booking_reference, check_in_date, check_out_date, status,
          wedding_group:wedding_groups(id, uuid, name, bride_name, groom_name)
        ),
        guest:guests(id, uuid, name, email, phone)
      `, { count: 'exact' })
      .not('booking.status', 'in', '("cancelled","failed")');

    if (transfer_status) {
      query = query.or(`arrival_transfer_status.eq.${transfer_status},departure_transfer_status.eq.${transfer_status}`);
    }
    if (arrival_date) query = query.eq('arrival_date', arrival_date);
    if (departure_date) query = query.eq('departure_date', departure_date);
    if (needs_arrival_transfer !== undefined) query = query.eq('needs_arrival_transfer', needs_arrival_transfer);
    if (needs_departure_transfer !== undefined) query = query.eq('needs_departure_transfer', needs_departure_transfer);
    if (search) {
      query = query.or(`arrival_flight_number.ilike.%${search}%,departure_flight_number.ilike.%${search}%`);
    }

    const { data: flights, count } = await query
      .order('arrival_date', { ascending: true })
      .range(offset, offset + limit - 1);

    return {
      flights: flights || [],
      total: count || 0,
    };
  }

  async findByWeddingGroup(groupUuid: string, params: GuestFlightQueryParams): Promise<GuestFlightListResult> {
    const supabase = await getSupabaseClient();

    // Get group ID
    const { data: group } = await supabase
      .from('wedding_groups')
      .select('id')
      .eq('uuid', groupUuid)
      .single();

    if (!group) return { flights: [], total: 0 };

    const { page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;

    // Exclude cancelled/failed bookings from flight listings
    const { data: flights, count } = await supabase
      .from('guest_flights')
      .select(`
        *,
        booking:bookings!inner(id, uuid, booking_reference, check_in_date, check_out_date, status, wedding_group_id,
          wedding_group:wedding_groups(id, uuid, name, bride_name, groom_name)
        ),
        guest:guests(id, uuid, name, email, phone)
      `, { count: 'exact' })
      .eq('booking.wedding_group_id', group.id)
      .not('booking.status', 'in', '("cancelled","failed")')
      .order('arrival_date', { ascending: true })
      .range(offset, offset + limit - 1);

    return {
      flights: flights || [],
      total: count || 0,
    };
  }

  async getGroupStats(groupUuid: string, filterAdminId?: number | null): Promise<GuestFlightStats> {
    const supabase = await getSupabaseClient();

    // Build group query with optional data filtering
    let groupQuery = supabase
      .from('wedding_groups')
      .select('id')
      .eq('uuid', groupUuid);

    if (filterAdminId !== null && filterAdminId !== undefined) {
      groupQuery = groupQuery.eq('created_by', filterAdminId);
    }

    const { data: group } = await groupQuery.single();

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

    // Get booking IDs for this group (exclude cancelled/failed bookings)
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('wedding_group_id', group.id)
      .not('status', 'in', '("cancelled","failed")');

    const bookingIds = (bookings || []).map(b => b.id);
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

    // Get all flights for this group
    const { data: flights } = await supabase
      .from('guest_flights')
      .select('*')
      .in('booking_id', bookingIds);

    const flightsArray = flights || [];

    return {
      total_flights: flightsArray.length,
      transfers: {
        arrival: {
          needing: flightsArray.filter(f => f.needs_arrival_transfer).length,
          pending: flightsArray.filter(f => f.needs_arrival_transfer && f.arrival_transfer_status === 'pending').length,
          confirmed: flightsArray.filter(f => f.arrival_transfer_status === 'confirmed').length,
        },
        departure: {
          needing: flightsArray.filter(f => f.needs_departure_transfer).length,
          pending: flightsArray.filter(f => f.needs_departure_transfer && f.departure_transfer_status === 'pending').length,
          confirmed: flightsArray.filter(f => f.departure_transfer_status === 'confirmed').length,
        },
      },
      arrivals_by_date: [], // TODO: Implement grouping
      departures_by_date: [], // TODO: Implement grouping
    };
  }

  async getGlobalStats(filterAdminId?: number | null): Promise<GuestFlightStats> {
    const supabase = await getSupabaseClient();

    // Build wedding group query with optional filtering
    let groupQuery = supabase.from('wedding_groups').select('id');
    if (filterAdminId !== null && filterAdminId !== undefined) {
      groupQuery = groupQuery.eq('created_by', filterAdminId);
    }

    const { data: groups } = await groupQuery;
    const groupIds = (groups || []).map(g => g.id);

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

    // Get booking IDs for accessible groups (exclude cancelled/failed bookings)
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id')
      .in('wedding_group_id', groupIds)
      .not('status', 'in', '("cancelled","failed")');

    const bookingIds = (bookings || []).map(b => b.id);
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

    // Get all flights for accessible groups
    const { data: flights } = await supabase
      .from('guest_flights')
      .select('*')
      .in('booking_id', bookingIds);

    const flightsArray = flights || [];

    return {
      total_flights: flightsArray.length,
      transfers: {
        arrival: {
          needing: flightsArray.filter(f => f.needs_arrival_transfer).length,
          pending: flightsArray.filter(f => f.needs_arrival_transfer && f.arrival_transfer_status === 'pending').length,
          confirmed: flightsArray.filter(f => f.arrival_transfer_status === 'confirmed').length,
        },
        departure: {
          needing: flightsArray.filter(f => f.needs_departure_transfer).length,
          pending: flightsArray.filter(f => f.needs_departure_transfer && f.departure_transfer_status === 'pending').length,
          confirmed: flightsArray.filter(f => f.departure_transfer_status === 'confirmed').length,
        },
      },
      arrivals_by_date: [],
      departures_by_date: [],
    };
  }

  async upsertByBooking(bookingId: number, guestId: number, data: CreateGuestFlightData): Promise<GuestFlightEntity> {
    const supabase = await getSupabaseClient();

    const { data: flight, error } = await supabase
      .from('guest_flights')
      .upsert({ ...data, booking_id: bookingId, guest_id: guestId }, { onConflict: 'booking_id' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return flight;
  }

  async update(uuid: string, data: UpdateGuestFlightData): Promise<GuestFlightEntity> {
    const supabase = await getSupabaseClient();

    const { data: flight, error } = await supabase
      .from('guest_flights')
      .update(data)
      .eq('uuid', uuid)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return flight;
  }

  async bulkUpdateTransferStatus(uuids: string[], data: UpdateGuestFlightData): Promise<number> {
    const supabase = await getSupabaseClient();

    const { count, error } = await supabase
      .from('guest_flights')
      .update(data)
      .in('uuid', uuids);

    if (error) throw new Error(error.message);
    return count || 0;
  }

  async deleteByBookingUuid(bookingUuid: string, guestId: number): Promise<boolean> {
    const supabase = await getSupabaseClient();

    const { data: booking } = await supabase
      .from('bookings')
      .select('id')
      .eq('uuid', bookingUuid)
      .eq('guest_id', guestId)
      .single();

    if (!booking) return false;

    const { error } = await supabase
      .from('guest_flights')
      .delete()
      .eq('booking_id', booking.id);

    return !error;
  }

  async getBookingAndGuestIds(bookingUuid: string, guestId: number): Promise<{ bookingId: number; guestId: number; status: string } | null> {
    const supabase = await getSupabaseClient();

    const { data: booking } = await supabase
      .from('bookings')
      .select('id, guest_id, status')
      .eq('uuid', bookingUuid)
      .eq('guest_id', guestId)
      .single();

    if (!booking) return null;
    return { bookingId: booking.id, guestId: booking.guest_id, status: booking.status };
  }

  async exportByWeddingGroup(groupUuid: string): Promise<GuestFlightEntity[]> {
    const supabase = await getSupabaseClient();

    const { data: group } = await supabase
      .from('wedding_groups')
      .select('id')
      .eq('uuid', groupUuid)
      .single();

    if (!group) return [];

    // Exclude cancelled/failed bookings from export
    const { data: flights } = await supabase
      .from('guest_flights')
      .select(`
        *,
        booking:bookings!inner(booking_reference, check_in_date, check_out_date, status, wedding_group_id),
        guest:guests(name, email, phone)
      `)
      .eq('booking.wedding_group_id', group.id)
      .not('booking.status', 'in', '("cancelled","failed")')
      .order('arrival_date', { ascending: true });

    return flights || [];
  }
}
