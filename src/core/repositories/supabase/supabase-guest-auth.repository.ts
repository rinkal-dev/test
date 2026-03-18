/**
 * ============================================
 * SUPABASE GUEST AUTH REPOSITORY
 * ============================================
 *
 * Supabase-specific implementation of IGuestAuthRepository.
 * Handles all database operations for guest authentication using Supabase.
 *
 * To use:
 * 1. Install: npm install @supabase/supabase-js
 * 2. Set env: DATABASE_PROVIDER=supabase
 * 3. Set env: SUPABASE_URL, SUPABASE_SERVICE_KEY
 * 4. Restart server
 */

import { Injectable } from '@nestjs/common';
import {
  IGuestAuthRepository,
  GuestAuthEntity,
  GuestAuthBasicEntity,
  BookingWithGuestEntity,
} from '../guest-auth.repository.interface';

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
export class SupabaseGuestAuthRepository implements IGuestAuthRepository {
  async findGuestByAccessToken(accessToken: string): Promise<GuestAuthEntity | null> {
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

    return {
      ...data,
      wedding_group: data.wedding_groups ? {
        ...data.wedding_groups,
        hotel: data.wedding_groups.hotels,
      } : null,
    } as GuestAuthEntity;
  }

  async findBookingByReferenceAndEmail(
    bookingReference: string,
    email: string,
  ): Promise<BookingWithGuestEntity | null> {
    const supabase = await getSupabaseClient();

    // First find the booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, uuid, booking_reference, guest_id')
      .eq('booking_reference', bookingReference)
      .single();

    if (bookingError && bookingError.code !== 'PGRST116') {
      throw new Error(`Supabase findBookingByReferenceAndEmail error: ${bookingError.message}`);
    }

    if (!booking) return null;

    // Then find the guest with email match
    const { data: guest, error: guestError } = await supabase
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
      .eq('id', booking.guest_id)
      .eq('email', email.toLowerCase())
      .single();

    if (guestError && guestError.code !== 'PGRST116') {
      throw new Error(`Supabase findBookingByReferenceAndEmail guest error: ${guestError.message}`);
    }

    if (!guest) return null;

    return {
      ...booking,
      guest: {
        ...guest,
        wedding_group: guest.wedding_groups ? {
          ...guest.wedding_groups,
          hotel: guest.wedding_groups.hotels,
        } : null,
      },
    } as BookingWithGuestEntity;
  }

  async findGuestById(guestId: number): Promise<GuestAuthBasicEntity | null> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('guests')
      .select('id, uuid, name, email, wedding_group_id, status')
      .eq('id', guestId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findGuestById error: ${error.message}`);
    }

    return data as GuestAuthBasicEntity || null;
  }

  async findGuestByIdWithRelations(guestId: number): Promise<GuestAuthEntity | null> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('guests')
      .select(`
        *,
        wedding_groups (
          uuid,
          name,
          booking_link,
          event_start_date,
          event_end_date,
          hotels (
            uuid,
            name,
            city,
            country
          )
        )
      `)
      .eq('id', guestId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findGuestByIdWithRelations error: ${error.message}`);
    }

    if (!data) return null;

    // Get bookings separately
    const { data: bookings } = await supabase
      .from('bookings')
      .select('uuid, booking_reference, check_in_date, check_out_date, total_rooms, total_amount, currency, status')
      .eq('guest_id', guestId)
      .not('status', 'in', '("cancelled","failed")');

    return {
      ...data,
      wedding_group: data.wedding_groups ? {
        ...data.wedding_groups,
        hotel: data.wedding_groups.hotels,
      } : null,
      bookings: bookings || [],
    } as GuestAuthEntity;
  }

  async updateBookingPreferences(
    bookingUuid: string,
    guestId: number,
    specialRequests?: string,
  ): Promise<{ success: boolean; message?: string; data?: any }> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('bookings')
      .update({ special_requests: specialRequests || null })
      .eq('uuid', bookingUuid)
      .eq('guest_id', guestId)
      .select()
      .single();

    if (error) {
      return { success: false, message: 'Booking not found or access denied' };
    }

    return {
      success: true,
      data: { special_requests: specialRequests },
    };
  }

  // ============================================
  // PASSWORD-BASED AUTHENTICATION METHODS
  // ============================================

  async findGuestByEmail(email: string): Promise<GuestAuthEntity | null> {
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
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findGuestByEmail error: ${error.message}`);
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
    } as GuestAuthEntity;
  }

  async findAllGuestsByEmail(email: string): Promise<GuestAuthEntity[]> {
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
      .eq('email', email.toLowerCase());

    if (error) {
      throw new Error(`Supabase findAllGuestsByEmail error: ${error.message}`);
    }

    if (!data || data.length === 0) return [];

    // Get bookings for all guest IDs
    const guestIds = data.map((g) => g.id);
    const { data: bookings } = await supabase
      .from('bookings')
      .select('guest_id, uuid, booking_reference, check_in_date, check_out_date, total_rooms, total_amount, currency, status')
      .in('guest_id', guestIds)
      .not('status', 'in', '("cancelled","failed")');

    // Map bookings to their respective guests
    return data.map((guest) => ({
      ...guest,
      wedding_group: guest.wedding_groups ? {
        ...guest.wedding_groups,
        hotel: guest.wedding_groups.hotels,
      } : null,
      bookings: (bookings || []).filter((b) => b.guest_id === guest.id),
    } as GuestAuthEntity));
  }

  async findGuestByUuid(uuid: string): Promise<GuestAuthEntity | null> {
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
          status
        )
      `)
      .eq('uuid', uuid)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findGuestByUuid error: ${error.message}`);
    }

    return data ? {
      ...data,
      wedding_group: data.wedding_groups,
    } as GuestAuthEntity : null;
  }

  async findGuestBySetPasswordToken(token: string): Promise<GuestAuthEntity | null> {
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
          status
        )
      `)
      .eq('set_password_token', token)
      .gt('set_password_token_expires', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findGuestBySetPasswordToken error: ${error.message}`);
    }

    return data ? {
      ...data,
      wedding_group: data.wedding_groups,
    } as GuestAuthEntity : null;
  }

  async findGuestByPasswordResetToken(token: string): Promise<GuestAuthEntity | null> {
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
          status
        )
      `)
      .eq('password_reset_token', token)
      .gt('password_reset_expires', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase findGuestByPasswordResetToken error: ${error.message}`);
    }

    return data ? {
      ...data,
      wedding_group: data.wedding_groups,
    } as GuestAuthEntity : null;
  }

  async updateGuestPassword(
    guestId: number,
    hashedPassword: string,
  ): Promise<{ success: boolean; message?: string }> {
    const supabase = await getSupabaseClient();

    const { error } = await supabase
      .from('guests')
      .update({
        password: hashedPassword,
        password_set_at: new Date().toISOString(),
        set_password_token: null,
        set_password_token_expires: null,
        password_reset_token: null,
        password_reset_expires: null,
      })
      .eq('id', guestId);

    if (error) {
      return { success: false, message: 'Guest not found' };
    }

    return { success: true };
  }

  async setPasswordResetToken(
    guestId: number,
    token: string,
    expiresAt: Date,
  ): Promise<{ success: boolean; message?: string }> {
    const supabase = await getSupabaseClient();

    const { error } = await supabase
      .from('guests')
      .update({
        password_reset_token: token,
        password_reset_expires: expiresAt.toISOString(),
      })
      .eq('id', guestId);

    if (error) {
      return { success: false, message: 'Guest not found' };
    }

    return { success: true };
  }

  async clearPasswordResetToken(guestId: number): Promise<{ success: boolean }> {
    const supabase = await getSupabaseClient();

    await supabase
      .from('guests')
      .update({
        password_reset_token: null,
        password_reset_expires: null,
      })
      .eq('id', guestId);

    return { success: true };
  }

  async setSetPasswordToken(
    guestId: number,
    token: string,
    expiresAt: Date,
  ): Promise<{ success: boolean; message?: string }> {
    const supabase = await getSupabaseClient();

    const { error } = await supabase
      .from('guests')
      .update({
        set_password_token: token,
        set_password_token_expires: expiresAt.toISOString(),
      })
      .eq('id', guestId);

    if (error) {
      return { success: false, message: 'Guest not found' };
    }

    return { success: true };
  }

  async clearSetPasswordToken(guestId: number): Promise<{ success: boolean }> {
    const supabase = await getSupabaseClient();

    await supabase
      .from('guests')
      .update({
        set_password_token: null,
        set_password_token_expires: null,
      })
      .eq('id', guestId);

    return { success: true };
  }
}
