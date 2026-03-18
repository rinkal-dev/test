/**
 * ============================================
 * WEDDING GROUP REPOSITORY INTERFACE
 * ============================================
 *
 * Wedding group-specific repository interface that extends base
 * repository with wedding group-specific query methods.
 *
 * Services use ONLY this interface, never the implementation.
 * This allows switching database providers without changing services.
 */

import { IBaseRepository, FindOptions } from './base.repository.interface';

/**
 * Wedding group entity type (provider-agnostic)
 */
export interface WeddingGroupEntity {
  id?: number;
  uuid: string;
  name: string;
  bride_name: string;
  groom_name: string;
  event_start_date: string;
  event_end_date: string;
  booking_window_start: string;
  booking_window_end: string;
  booking_link: string;
  hotel_id: number;
  deposit_type: 'fixed' | 'percentage' | 'per_person';
  deposit_value: number;
  final_payment_due_days: number;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  whatsapp_enabled: boolean;
  invitations_sent_at?: Date | null;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  currency_code?: string; // ISO 4217 currency code (e.g., 'USD', 'CAD')
  tax_rate?: number; // Tax rate percentage (e.g., 15.00 = 15%)
  timezone?: string; // IANA timezone (e.g., 'America/Cancun')
  welcome_message?: string | null;
  image_url?: string | null;
  created_by?: number | null;
  created_at?: Date | null;
  updated_at?: Date | null;
  // Computed fields (from subqueries)
  bookings_count?: number;
  total_revenue?: number;
  // Relations
  hotel?: HotelRelation;
  created_by_admin?: AdminRelation;
  group_room_blocks?: GroupRoomBlockEntity[];
  group_addons?: GroupAddonEntity[];
  guests?: GuestEntity[];
  bookings?: BookingEntity[];
}

/**
 * Hotel relation (simplified for includes)
 */
export interface HotelRelation {
  id?: number;
  uuid: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  image_url?: string | null;
}

/**
 * Admin relation (simplified for includes)
 */
export interface AdminRelation {
  id?: number;
  uuid: string;
  name: string;
  email: string;
}

/**
 * Group room block entity (for relations)
 */
export interface GroupRoomBlockEntity {
  id?: number;
  uuid: string;
  room_type_id: number;
  total_rooms: number;
  booked_rooms: number;
  price_per_night: number;
  min_nights?: number | null;
  max_nights?: number | null;
  is_active: boolean;
}

/**
 * Group addon entity (for relations)
 */
export interface GroupAddonEntity {
  id?: number;
  uuid: string;
  name: string;
  description?: string | null;
  price: number;
  price_type: 'per_person' | 'per_room' | 'flat';
  is_active: boolean;
}

/**
 * Guest entity (for relations)
 */
export interface GuestEntity {
  id?: number;
  uuid: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  status: string;
}

/**
 * Booking entity (for relations)
 */
export interface BookingEntity {
  id?: number;
  uuid: string;
  booking_reference: string;
  status: string;
  total_amount: number;
}

/**
 * Create wedding group DTO (provider-agnostic)
 */
export interface CreateWeddingGroupData {
  uuid: string;
  name: string;
  bride_name: string;
  groom_name: string;
  event_start_date: string;
  event_end_date: string;
  booking_window_start: string;
  booking_window_end: string;
  booking_link: string;
  hotel_id: number;
  deposit_type: 'fixed' | 'percentage' | 'per_person';
  deposit_value: number;
  final_payment_due_days?: number;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  whatsapp_enabled?: boolean;
  status?: 'draft' | 'active' | 'completed' | 'cancelled';
  created_by?: number;
}

/**
 * Update wedding group DTO (provider-agnostic)
 */
export interface UpdateWeddingGroupData {
  name?: string;
  bride_name?: string;
  groom_name?: string;
  event_start_date?: string;
  event_end_date?: string;
  booking_window_start?: string;
  booking_window_end?: string;
  hotel_id?: number;
  deposit_type?: 'fixed' | 'percentage' | 'per_person';
  deposit_value?: number;
  final_payment_due_days?: number;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  whatsapp_enabled?: boolean;
  invitations_sent_at?: Date;
  status?: 'draft' | 'active' | 'completed' | 'cancelled';
  welcome_message?: string;
  image_url?: string;
}

/**
 * Wedding group query parameters
 */
export interface WeddingGroupQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  hotel_id?: number;
  status?: 'draft' | 'active' | 'completed' | 'cancelled';
  created_by?: number;
  event_date_from?: string;
  event_date_to?: string;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

/**
 * Wedding group repository interface
 * Extends base repository with wedding group-specific methods
 */
export interface IWeddingGroupRepository
  extends IBaseRepository<WeddingGroupEntity, CreateWeddingGroupData, UpdateWeddingGroupData> {
  /**
   * Find wedding group by booking link
   */
  findByBookingLink(bookingLink: string): Promise<WeddingGroupEntity | null>;

  /**
   * Check if booking link exists (optionally excluding a uuid)
   */
  isBookingLinkExists(bookingLink: string, excludeUuid?: string): Promise<boolean>;

  /**
   * Get all wedding groups with pagination and filters
   */
  findAllWithFilters(
    query: WeddingGroupQueryParams,
  ): Promise<{ rows: WeddingGroupEntity[]; count: number }>;

  /**
   * Change wedding group status
   */
  changeStatus(uuid: string, status: 'draft' | 'active' | 'completed' | 'cancelled'): Promise<[number]>;

  /**
   * Get wedding group with all relations (hotel, room blocks, addons, etc.)
   */
  findByUuidWithRelations(uuid: string): Promise<WeddingGroupEntity | null>;

  /**
   * Get wedding group by booking link with relations (for public booking page)
   */
  findByBookingLinkWithRelations(bookingLink: string): Promise<WeddingGroupEntity | null>;

  /**
   * Update invitations sent timestamp
   */
  markInvitationsSent(uuid: string): Promise<[number]>;

  /**
   * Get wedding groups by hotel
   * @param hotelId - The hotel ID to filter by
   * @param filterAdminId - Optional admin ID for data-level filtering (null = no filter)
   */
  findByHotelId(hotelId: number, filterAdminId?: number | null): Promise<WeddingGroupEntity[]>;

  /**
   * Get active wedding groups count for dashboard
   * @param filterAdminId - Optional admin ID for data-level filtering (null = no filter)
   */
  getActiveCount(filterAdminId?: number | null): Promise<number>;

  /**
   * Generate unique booking link
   */
  generateUniqueBookingLink(baseName: string): Promise<string>;
}

/**
 * Repository token for dependency injection
 */
export const WEDDING_GROUP_REPOSITORY = 'WEDDING_GROUP_REPOSITORY';
