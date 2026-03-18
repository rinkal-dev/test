/**
 * ============================================
 * SUPABASE BOOKING WIZARD REPOSITORY
 * ============================================
 *
 * Supabase-specific implementation of IBookingWizardRepository.
 * Handles all database operations for the public booking wizard using Supabase.
 *
 * To use:
 * 1. Install: npm install @supabase/supabase-js
 * 2. Set env: DATABASE_PROVIDER=supabase
 * 3. Set env: SUPABASE_URL, SUPABASE_SERVICE_KEY
 * 4. Restart server
 */

import { Injectable } from '@nestjs/common';
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
export class SupabaseBookingWizardRepository implements IBookingWizardRepository {
  // ============================================
  // WEDDING GROUP METHODS
  // ============================================

  async findWeddingByBookingLink(bookingLink: string): Promise<WeddingGroupBasicEntity | null> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('wedding_groups')
      .select(`
        id,
        uuid,
        name,
        booking_link,
        event_start_date,
        event_end_date,
        booking_window_start,
        booking_window_end,
        deposit_type,
        deposit_value,
        final_payment_due_days,
        status,
        hotels (
          uuid,
          name,
          city,
          country
        )
      `)
      .eq('booking_link', bookingLink)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findWeddingByBookingLink error: ${error.message}`);
    }

    if (!data) return null;

    // Map hotels relation to hotel
    return {
      ...data,
      hotel: data.hotels,
    } as WeddingGroupBasicEntity;
  }

  // ============================================
  // ROOM BLOCK METHODS
  // ============================================

  async findRoomBlocksByWeddingId(weddingGroupId: number): Promise<RoomBlockEntity[]> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('group_room_blocks')
      .select(`
        id,
        uuid,
        wedding_group_id,
        room_type_id,
        rooms_allocated,
        rooms_booked,
        price_per_night,
        price_type,
        rate_sun_wed,
        rate_thu_sat,
        base_occupancy,
        extra_adult_per_night,
        extra_child_per_night,
        extra_teen_per_night,
        min_nights,
        max_nights,
        is_active,
        room_types (
          uuid,
          name,
          slug,
          description,
          bed_type,
          room_size,
          max_occupancy,
          max_adults,
          max_children,
          amenities,
          image_url,
          gallery_images
        )
      `)
      .eq('wedding_group_id', weddingGroupId)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Supabase findRoomBlocksByWeddingId error: ${error.message}`);
    }

    return (data || []).map((block: any) => ({
      ...block,
      room_type: block.room_types,
    })) as RoomBlockEntity[];
  }

  async findRoomBlockByUuid(uuid: string): Promise<RoomBlockEntity | null> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('group_room_blocks')
      .select(`
        id,
        uuid,
        wedding_group_id,
        room_type_id,
        rooms_allocated,
        rooms_booked,
        price_per_night,
        price_type,
        rate_sun_wed,
        rate_thu_sat,
        base_occupancy,
        extra_adult_per_night,
        extra_child_per_night,
        extra_teen_per_night,
        min_nights,
        max_nights,
        is_active,
        room_types (
          uuid,
          name,
          slug,
          description,
          bed_type,
          room_size,
          max_occupancy,
          max_adults,
          max_children,
          amenities,
          image_url,
          gallery_images
        )
      `)
      .eq('uuid', uuid)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findRoomBlockByUuid error: ${error.message}`);
    }

    if (!data) return null;

    return {
      ...data,
      room_type: data.room_types,
    } as RoomBlockEntity;
  }

  async findRoomBlockById(id: number): Promise<RoomBlockEntity | null> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('group_room_blocks')
      .select(`
        id,
        uuid,
        wedding_group_id,
        room_type_id,
        rooms_allocated,
        rooms_booked,
        price_per_night,
        price_type,
        rate_sun_wed,
        rate_thu_sat,
        base_occupancy,
        extra_adult_per_night,
        extra_child_per_night,
        extra_teen_per_night,
        min_nights,
        max_nights,
        is_active,
        room_types (
          uuid,
          name,
          slug,
          description,
          bed_type,
          room_size,
          max_occupancy,
          max_adults,
          max_children,
          amenities,
          image_url,
          gallery_images
        )
      `)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findRoomBlockById error: ${error.message}`);
    }

    if (!data) return null;

    return {
      ...data,
      room_type: data.room_types,
    } as RoomBlockEntity;
  }

  async countBookedRoomsForDateRange(
    weddingGroupId: number,
    roomBlockId: number,
    checkIn: string,
    checkOut: string,
  ): Promise<number> {
    const supabase = await getSupabaseClient();

    // Get bookings that overlap with the date range
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id')
      .eq('wedding_group_id', weddingGroupId)
      .not('status', 'in', '("cancelled","failed")')
      .lt('check_in_date', checkOut)
      .gt('check_out_date', checkIn);

    if (bookingsError) {
      throw new Error(`Supabase countBookedRoomsForDateRange error: ${bookingsError.message}`);
    }

    if (!bookings || bookings.length === 0) {
      return 0;
    }

    const bookingIds = bookings.map((b: any) => b.id);

    // Count booking rooms for these bookings
    const { count, error: countError } = await supabase
      .from('booking_rooms')
      .select('*', { count: 'exact', head: true })
      .eq('room_block_id', roomBlockId)
      .in('booking_id', bookingIds);

    if (countError) {
      throw new Error(`Supabase countBookedRoomsForDateRange count error: ${countError.message}`);
    }

    return count || 0;
  }

  // ============================================
  // ADDON METHODS
  // ============================================

  async findAddonsByWeddingId(weddingGroupId: number): Promise<BookingWizardAddonEntity[]> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('group_addons')
      .select('*')
      .eq('wedding_group_id', weddingGroupId)
      .eq('is_active', true)
      .order('addon_type', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Supabase findAddonsByWeddingId error: ${error.message}`);
    }

    return (data || []) as BookingWizardAddonEntity[];
  }

  async findAddonByUuid(uuid: string): Promise<BookingWizardAddonEntity | null> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('group_addons')
      .select('*')
      .eq('uuid', uuid)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findAddonByUuid error: ${error.message}`);
    }

    return data as BookingWizardAddonEntity || null;
  }

  // ============================================
  // GUEST METHODS
  // ============================================

  async findGuestByEmailAndWedding(
    email: string,
    weddingGroupId: number,
  ): Promise<BookingWizardGuestEntity | null> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('guests')
      .select(`
        *,
        wedding_groups (
          id,
          uuid,
          name,
          booking_link,
          event_start_date,
          event_end_date,
          status,
          hotels (
            uuid,
            name,
            city,
            country
          )
        )
      `)
      .eq('email', email.toLowerCase())
      .eq('wedding_group_id', weddingGroupId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findGuestByEmailAndWedding error: ${error.message}`);
    }

    if (!data) return null;

    return {
      ...data,
      wedding_group: data.wedding_groups ? {
        ...data.wedding_groups,
        hotel: data.wedding_groups.hotels,
      } : null,
    } as BookingWizardGuestEntity;
  }

  async findGuestByAccessToken(accessToken: string): Promise<BookingWizardGuestEntity | null> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('guests')
      .select(`
        *,
        wedding_groups (
          id,
          uuid,
          name,
          booking_link,
          event_start_date,
          event_end_date,
          status,
          hotels (
            uuid,
            name,
            city,
            country
          )
        )
      `)
      .eq('access_token', accessToken)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findGuestByAccessToken error: ${error.message}`);
    }

    if (!data) return null;

    // Get bookings separately
    const { data: bookings } = await supabase
      .from('bookings')
      .select('uuid, booking_reference, check_in_date, check_out_date, total_rooms, total_amount, currency, status')
      .eq('guest_id', data.id)
      .not('status', 'in', '("cancelled","failed")');

    return {
      ...data,
      wedding_group: data.wedding_groups ? {
        ...data.wedding_groups,
        hotel: data.wedding_groups.hotels,
      } : null,
      bookings: bookings || [],
    } as BookingWizardGuestEntity;
  }

  async createGuest(data: CreateGuestData): Promise<BookingWizardGuestEntity> {
    const supabase = await getSupabaseClient();

    const { data: guest, error } = await supabase
      .from('guests')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase createGuest error: ${error.message}`);
    }

    return guest as BookingWizardGuestEntity;
  }

  async updateGuest(id: number, data: UpdateGuestData): Promise<void> {
    const supabase = await getSupabaseClient();

    const { error } = await supabase
      .from('guests')
      .update(data)
      .eq('id', id);

    if (error) {
      throw new Error(`Supabase updateGuest error: ${error.message}`);
    }
  }

  async isAccessTokenExists(token: string): Promise<boolean> {
    const supabase = await getSupabaseClient();

    const { count, error } = await supabase
      .from('guests')
      .select('*', { count: 'exact', head: true })
      .eq('access_token', token);

    if (error) {
      throw new Error(`Supabase isAccessTokenExists error: ${error.message}`);
    }

    return (count || 0) > 0;
  }

  // ============================================
  // BOOKING METHODS
  // ============================================

  async createBooking(data: CreateBookingData): Promise<BookingBasicEntity> {
    const supabase = await getSupabaseClient();

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase createBooking error: ${error.message}`);
    }

    return booking as BookingBasicEntity;
  }

  async createBookingRoom(data: CreateBookingRoomData): Promise<BookingRoomEntity> {
    const supabase = await getSupabaseClient();

    const { data: bookingRoom, error } = await supabase
      .from('booking_rooms')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase createBookingRoom error: ${error.message}`);
    }

    return bookingRoom as BookingRoomEntity;
  }

  async createBookingAddon(data: CreateBookingAddonData): Promise<BookingAddonEntity> {
    const supabase = await getSupabaseClient();

    const { data: bookingAddon, error } = await supabase
      .from('booking_addons')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase createBookingAddon error: ${error.message}`);
    }

    return bookingAddon as BookingAddonEntity;
  }

  async isBookingReferenceExists(reference: string): Promise<boolean> {
    const supabase = await getSupabaseClient();

    const { count, error } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('booking_reference', reference);

    if (error) {
      throw new Error(`Supabase isBookingReferenceExists error: ${error.message}`);
    }

    return (count || 0) > 0;
  }

  async findBookingByReference(reference: string): Promise<BookingBasicEntity | null> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_reference', reference)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findBookingByReference error: ${error.message}`);
    }

    return data as BookingBasicEntity || null;
  }

  async findBookingByReferenceWithGuest(reference: string): Promise<BookingBasicEntity | null> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        guests (
          *,
          wedding_groups (
            id,
            uuid,
            name,
            booking_link,
            event_start_date,
            event_end_date,
            status,
            hotels (
              uuid,
              name,
              city,
              country
            )
          )
        )
      `)
      .eq('booking_reference', reference)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findBookingByReferenceWithGuest error: ${error.message}`);
    }

    return data as BookingBasicEntity || null;
  }

  async findBookingsByGuestId(guestId: number): Promise<BookingBasicEntity[]> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('guest_id', guestId)
      .not('status', 'in', '("cancelled","failed")')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Supabase findBookingsByGuestId error: ${error.message}`);
    }

    return (data || []) as BookingBasicEntity[];
  }

  // ============================================
  // INVENTORY HOLD METHODS
  // ============================================

  async createHold(data: CreateHoldData): Promise<BookingHoldEntity> {
    const supabase = await getSupabaseClient();

    const { data: hold, error } = await supabase
      .from('booking_holds')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase createHold error: ${error.message}`);
    }

    return hold as BookingHoldEntity;
  }

  async findHoldByUuid(uuid: string): Promise<BookingHoldEntity | null> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('booking_holds')
      .select('*')
      .eq('uuid', uuid)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findHoldByUuid error: ${error.message}`);
    }

    return data as BookingHoldEntity || null;
  }

  async findHoldByCheckoutToken(checkoutToken: string): Promise<BookingHoldEntity | null> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('booking_holds')
      .select('*')
      .eq('checkout_token', checkoutToken)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findHoldByCheckoutToken error: ${error.message}`);
    }

    return data as BookingHoldEntity || null;
  }

  async findActiveHoldsForSession(guestSessionId: string): Promise<BookingHoldEntity[]> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('booking_holds')
      .select('*')
      .eq('guest_session_id', guestSessionId)
      .in('status', ['active', 'payment_pending'])
      .gt('expires_at', new Date().toISOString());

    if (error) {
      throw new Error(`Supabase findActiveHoldsForSession error: ${error.message}`);
    }

    return (data || []) as BookingHoldEntity[];
  }

  async countHeldRoomsForDateRange(
    weddingGroupId: number,
    roomBlockId: number,
    checkIn: string,
    checkOut: string,
    excludeSessionId?: string,
  ): Promise<number> {
    const supabase = await getSupabaseClient();

    let query = supabase
      .from('booking_holds')
      .select('quantity')
      .eq('wedding_group_id', weddingGroupId)
      .eq('room_block_id', roomBlockId)
      .in('status', ['active', 'payment_pending'])
      .gt('expires_at', new Date().toISOString())
      .lt('check_in_date', checkOut)
      .gt('check_out_date', checkIn);

    if (excludeSessionId) {
      query = query.neq('guest_session_id', excludeSessionId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Supabase countHeldRoomsForDateRange error: ${error.message}`);
    }

    return (data || []).reduce((sum: number, hold: any) => sum + (hold.quantity || 0), 0);
  }

  async updateHold(id: number, data: UpdateHoldData): Promise<void> {
    const supabase = await getSupabaseClient();

    const { error } = await supabase
      .from('booking_holds')
      .update(data)
      .eq('id', id);

    if (error) {
      throw new Error(`Supabase updateHold error: ${error.message}`);
    }
  }

  async releaseExpiredHolds(): Promise<number> {
    const supabase = await getSupabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('booking_holds')
      .update({
        status: 'expired',
        release_reason: 'Hold expired',
        released_at: now,
      })
      .in('status', ['active', 'payment_pending'])
      .lte('expires_at', now)
      .select();

    if (error) {
      throw new Error(`Supabase releaseExpiredHolds error: ${error.message}`);
    }

    return data?.length || 0;
  }

  async releaseHoldsForSession(guestSessionId: string, reason: string): Promise<number> {
    const supabase = await getSupabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('booking_holds')
      .update({
        status: 'released',
        release_reason: reason,
        released_at: now,
      })
      .eq('guest_session_id', guestSessionId)
      .in('status', ['active', 'payment_pending'])
      .select();

    if (error) {
      throw new Error(`Supabase releaseHoldsForSession error: ${error.message}`);
    }

    return data?.length || 0;
  }

  async convertHoldsToBooking(guestSessionId: string, bookingId: number): Promise<number> {
    const supabase = await getSupabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('booking_holds')
      .update({
        status: 'converted',
        converted_to_booking_id: bookingId,
        released_at: now,
      })
      .eq('guest_session_id', guestSessionId)
      .in('status', ['active', 'payment_pending'])
      .select();

    if (error) {
      throw new Error(`Supabase convertHoldsToBooking error: ${error.message}`);
    }

    return data?.length || 0;
  }
}
