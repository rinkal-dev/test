/**
 * ============================================
 * GUESTS REPOSITORY INTERFACE
 * ============================================
 *
 * Guest-specific repository interface that extends base
 * repository with guest-specific query methods.
 *
 * Services use ONLY this interface, never the implementation.
 * This allows switching database providers without changing services.
 */

import { IBaseRepository, FindOptions } from './base.repository.interface';

/**
 * Guest entity type (provider-agnostic)
 */
export interface GuestEntity {
  id?: number;
  uuid: string;
  wedding_group_id: number;
  access_token: string;
  name: string;
  email: string;
  phone?: string | null;
  relationship?: 'family' | 'friend' | 'colleague' | 'other' | null;
  side?: 'bride' | 'groom' | 'mutual' | null;
  plus_ones_allowed: number;
  invitation_channel: 'email' | 'whatsapp' | 'both';
  invitation_sent: boolean;
  invitation_sent_at?: Date | null;
  invitation_opened_at?: Date | null;
  last_reminder_sent_at?: Date | null;
  import_source: 'api' | 'excel' | 'manual';
  notes?: string | null;
  status: 'pending' | 'invited' | 'booked' | 'declined';
  created_at?: Date | null;
  updated_at?: Date | null;
  // Password-related fields
  password?: string | null;
  password_set_at?: Date | null;
  password_reset_token?: string | null;
  password_reset_expires?: Date | null;
  set_password_token?: string | null;
  set_password_token_expires?: Date | null;
  // Relations
  wedding_group?: WeddingGroupRelation | null;
  bookings?: BookingRelation[];
}

/**
 * Wedding group relation (for includes)
 */
export interface WeddingGroupRelation {
  id?: number;
  uuid: string;
  name: string;
  booking_link?: string | null;
  event_start_date?: Date | null;
  event_end_date?: Date | null;
  status?: string | null;
  welcome_message?: string | null;
  bride_name?: string | null;
  groom_name?: string | null;
  hotel_id?: number | null;
  hotel?: HotelRelation | null;
  created_by?: number | null;
}

/**
 * Hotel relation (for includes)
 */
export interface HotelRelation {
  name: string;
  city?: string | null;
  country?: string | null;
}

/**
 * Booking relation (for includes)
 */
export interface BookingRelation {
  id?: number;
  uuid: string;
  booking_reference: string;
  check_in_date?: Date | null;
  check_out_date?: Date | null;
  total_rooms?: number | null;
  total_adults?: number | null;
  total_children?: number | null;
  total_amount?: number | null;
  currency?: string | null;
  status?: string | null;
  created_at?: Date | null;
}

/**
 * Create guest DTO (provider-agnostic)
 */
export interface CreateGuestData {
  uuid: string;
  wedding_group_id: number;
  access_token: string;
  name: string;
  email: string;
  phone?: string | null;
  relationship?: string | null;
  side?: string | null;
  plus_ones_allowed?: number;
  invitation_channel?: string;
  notes?: string | null;
  import_source?: string;
  status?: string;
}

/**
 * Update guest DTO (provider-agnostic)
 */
export interface UpdateGuestData {
  name?: string;
  email?: string;
  phone?: string | null;
  relationship?: string | null;
  side?: string | null;
  plus_ones_allowed?: number;
  invitation_channel?: string;
  notes?: string | null;
  status?: string;
  invitation_sent?: boolean;
  invitation_sent_at?: Date | null;
  invitation_opened_at?: Date | null;
  last_reminder_sent_at?: Date | null;
  access_token?: string;
  // Password-related fields
  set_password_token?: string | null;
  set_password_token_expires?: Date | null;
}

/**
 * Guest query parameters
 */
export interface GuestQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  wedding_group_uuid?: string;
  status?: string;
  relationship?: string;
  side?: string;
  invitation_sent?: boolean;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

/**
 * Guest stats result
 */
export interface GuestStats {
  total: number;
  invited: number;
  by_status: {
    pending: number;
    invited: number;
    booked: number;
    declined: number;
  };
  response_rate: number;
  booking_rate: number;
}

/**
 * Formatted guest for API response
 */
export interface FormattedGuest {
  uuid: string;
  name: string;
  email: string;
  phone: string | null;
  relationship: string | null;
  side: string | null;
  plus_ones_allowed: number;
  invitation_channel: string;
  invitation_sent: boolean;
  invitation_sent_at: Date | null;
  status: string;
  notes: string | null;
  import_source: string;
  wedding_group: {
    uuid: string;
    name: string;
    booking_link: string | null;
  } | null;
  has_bookings: boolean;
  created_at: Date | null;
  updated_at: Date | null;
}

/**
 * Formatted guest details for API response
 */
export interface FormattedGuestDetails extends FormattedGuest {
  invitation_opened_at: Date | null;
  last_reminder_sent_at: Date | null;
  access_token: string;
  wedding_group: {
    uuid: string;
    name: string;
    booking_link: string | null;
    event_start_date: Date | null;
    event_end_date: Date | null;
    status: string | null;
    created_by?: number | null;
  } | null;
  bookings: Array<{
    uuid: string;
    booking_reference: string;
    check_in_date: Date | null;
    check_out_date: Date | null;
    total_rooms: number | null;
    total_adults: number | null;
    total_children: number | null;
    total_amount: number | null;
    currency: string | null;
    status: string | null;
    created_at: Date | null;
  }>;
}

/**
 * Guest invitation data for email service
 */
export interface GuestInvitationInfo {
  uuid: string;
  name: string;
  email: string;
  access_token: string;
  plus_ones_allowed: number;
  wedding_group: WeddingGroupRelation | null;
}

/**
 * Guests repository interface
 * Extends base repository with guest-specific methods
 */
export interface IGuestsRepository
  extends IBaseRepository<GuestEntity, CreateGuestData, UpdateGuestData> {
  /**
   * Find guest by email in a wedding group
   */
  findByEmailInGroup(email: string, weddingGroupId: number): Promise<GuestEntity | null>;

  /**
   * Check if email exists in wedding group (optionally excluding a guest)
   */
  isEmailExistsInGroup(
    email: string,
    weddingGroupId: number,
    excludeGuestId?: number,
  ): Promise<boolean>;

  /**
   * Get all guests with pagination and filters
   * @param query - Query parameters
   * @param filterAdminId - Optional admin ID for data-level filtering (null = no filter)
   */
  findAllWithFilters(
    query: GuestQueryParams,
    filterAdminId?: number | null,
  ): Promise<{ rows: GuestEntity[]; count: number }>;

  /**
   * Find guest by UUID with wedding group relation
   */
  findByUuidWithWeddingGroup(uuid: string): Promise<GuestEntity | null>;

  /**
   * Find guest by UUID with full details (wedding group, bookings)
   */
  findByUuidWithDetails(uuid: string): Promise<GuestEntity | null>;

  /**
   * Find guest by UUID with invitation data (for sending invitations)
   */
  findByUuidForInvitation(uuid: string): Promise<GuestEntity | null>;

  /**
   * Get wedding group ID by UUID
   */
  getWeddingGroupIdByUuid(uuid: string): Promise<number | null>;

  /**
   * Get wedding group by UUID with owner information
   */
  getWeddingGroupByUuid(uuid: string): Promise<{ id: number; created_by: number | null } | null>;

  /**
   * Get guest statistics for a wedding group
   */
  getStatsByWeddingGroup(weddingGroupId: number): Promise<GuestStats>;

  /**
   * Update guest instance directly (for use when guest is already loaded)
   */
  updateInstance(guest: GuestEntity, data: UpdateGuestData): Promise<GuestEntity>;
}

/**
 * Repository token for dependency injection
 */
export const GUESTS_REPOSITORY = 'GUESTS_REPOSITORY';
