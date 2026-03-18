/**
 * ============================================
 * BOOKING WIZARD REPOSITORY INTERFACE
 * ============================================
 *
 * Domain-specific repository interface for the public booking wizard.
 * Combines operations needed for date checking, room availability,
 * price calculation, and booking creation.
 *
 * Services use ONLY this interface, never the implementation.
 * This allows switching database providers without changing services.
 */

import { IBaseRepository, FindOptions } from './base.repository.interface';

// ============================================
// ENTITY TYPES (Provider-agnostic)
// ============================================

export interface WeddingGroupBasicEntity {
  id: number;
  uuid: string;
  name: string;
  bride_name: string;
  groom_name: string;
  booking_link: string;
  event_start_date: string;
  event_end_date: string;
  booking_window_start: string;
  booking_window_end: string;
  deposit_type: 'fixed' | 'percentage' | 'per_person';
  deposit_value: number;
  final_payment_due_days: number;
  status: string;
  currency_code?: string; // ISO 4217 currency code (e.g., 'USD', 'CAD')
  tax_rate?: number; // Tax rate percentage (e.g., 15.00 = 15%)
  hotel?: {
    uuid: string;
    name: string;
    city: string;
    country: string;
  };
}

export interface RoomBlockEntity {
  id: number;
  uuid: string;
  wedding_group_id: number;
  room_type_id: number;
  rooms_allocated: number;
  rooms_booked: number;
  price_per_night: number;
  price_type?: 'per_room' | 'per_person'; // per_room (default) or per_person
  // Variable pricing fields
  rate_sun_wed?: number | null;
  rate_thu_sat?: number | null;
  base_occupancy?: number;
  extra_adult_per_night?: number | null;
  extra_child_per_night?: number | null;
  extra_teen_per_night?: number | null;
  min_nights: number | null;
  max_nights: number | null;
  is_active: boolean;
  room_type?: {
    uuid: string;
    name: string;
    slug: string;
    description: string | null;
    bed_type: string | null;
    room_size: number | null;
    max_occupancy: number | null;
    max_adults: number | null;
    max_children: number | null;
    amenities: string[] | null;
    image_url: string | null;
    gallery_images: string[] | null;
  };
}

export interface BookingWizardAddonEntity {
  id: number;
  uuid: string;
  wedding_group_id: number;
  addon_type: string;
  name: string;
  description: string | null;
  price: number;
  pricing_type: 'per_stay' | 'per_night' | 'per_guest' | 'per_guest_per_night';
  applies_to: 'all_guests' | 'adults_only' | 'children_only';
  max_quantity: number | null;
  is_active: boolean;
}

export interface BookingWizardGuestEntity {
  id: number;
  uuid: string;
  wedding_group_id: number;
  access_token: string;
  name: string;
  email: string;
  phone: string | null;
  relationship: string | null;
  side: string | null;
  plus_ones_allowed: number;
  status: string;
  // Password fields
  password?: string | null;
  set_password_token?: string | null;
  set_password_token_expires?: Date | null;
  wedding_group?: WeddingGroupBasicEntity;
  bookings?: BookingBasicEntity[];
}

export interface BookingBasicEntity {
  id: number;
  uuid: string;
  booking_reference: string;
  wedding_group_id: number;
  guest_id: number;
  check_in_date: string;
  check_out_date: string;
  total_rooms: number;
  total_nights: number;
  total_adults: number;
  total_children: number;
  total_amount: number;
  deposit_amount: number;
  final_amount: number;
  currency: string;
  status: string;
  special_requests: string | null;
  deposit_paid_at: Date | null;
  created_at: Date | null;
}

export interface BookingRoomEntity {
  id: number;
  uuid: string;
  booking_id: number;
  room_block_id: number;
  room_type_id: number;
  quantity: number;
  adults: number;
  children: number;
  teens: number;
  price_per_night: number;
  total_nights: number;
  subtotal: number;
  extra_person_charges: number;
  price_breakdown: object | null;
}

export interface BookingAddonEntity {
  id: number;
  uuid: string;
  booking_id: number;
  group_addon_id: number;
  addon_type: string;
  quantity: number;
  price: number;
  pricing_type: 'per_stay' | 'per_night' | 'per_guest' | 'per_guest_per_night';
  applies_to: 'all_guests' | 'adults_only' | 'children_only';
  subtotal: number;
}

// ============================================
// BOOKING HOLD ENTITY (Inventory Hold System)
// ============================================

export type HoldStatus = 'active' | 'payment_pending' | 'converted' | 'released' | 'expired';

export interface BookingHoldEntity {
  id: number;
  uuid: string;
  wedding_group_id: number;
  room_block_id: number;
  quantity: number;
  guest_session_id: string;
  checkout_token: string | null;
  status: HoldStatus;
  check_in_date: string;
  check_out_date: string;
  held_at: Date;
  expires_at: Date;
  release_reason: string | null;
  released_at: Date | null;
  converted_to_booking_id: number | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface CreateHoldData {
  uuid: string;
  wedding_group_id: number;
  room_block_id: number;
  quantity: number;
  guest_session_id: string;
  checkout_token?: string;
  check_in_date: string;
  check_out_date: string;
  held_at: Date;
  expires_at: Date;
}

export interface UpdateHoldData {
  status?: HoldStatus;
  checkout_token?: string;
  expires_at?: Date;
  release_reason?: string;
  released_at?: Date;
  converted_to_booking_id?: number;
}

// ============================================
// CREATE/UPDATE DTOs
// ============================================

export interface CreateGuestData {
  uuid: string;
  wedding_group_id: number;
  access_token: string;
  name: string;
  email: string;
  phone?: string;
  relationship?: string;
  side?: string;
  status: string;
  import_source: string;
  // Password fields
  password?: string;
  password_set_at?: Date;
}

export interface UpdateGuestData {
  name?: string;
  phone?: string;
  relationship?: string;
  side?: string;
  status?: string;
  access_token?: string;
  // Password fields
  password?: string;
  password_set_at?: Date;
}

export interface CreateBookingData {
  uuid: string;
  booking_reference: string;
  wedding_group_id: number;
  guest_id: number;
  check_in_date: string;
  check_out_date: string;
  total_rooms: number;
  total_nights: number;
  total_adults: number;
  total_children: number;
  subtotal?: number;  // Pre-tax amount (rooms + addons)
  tax_rate?: number;  // Tax rate at time of booking
  tax_amount?: number;  // Calculated tax amount
  total_amount: number;  // Total INCLUDING taxes
  deposit_amount: number;
  final_amount: number;
  currency: string;
  status: string;
  special_requests?: string;
  deposit_paid_at?: Date;
  guest_timezone?: string | null; // IANA timezone where guest made the booking
  roommate_opt_in?: boolean; // Solo traveler connection opt-in
  roommate_note?: string | null; // Optional roommate preference note
}

export interface CreateBookingRoomData {
  uuid: string;
  booking_id: number;
  room_block_id: number;
  room_type_id: number;
  quantity: number;
  adults: number;
  children: number;
  teens?: number;
  price_per_night: number;
  total_nights: number;
  subtotal: number;
  extra_person_charges?: number;
  price_breakdown?: object | null;
}

export interface CreateBookingAddonData {
  uuid: string;
  booking_id: number;
  group_addon_id: number;
  addon_type: string;
  quantity: number;
  price: number;
  pricing_type: 'per_stay' | 'per_night' | 'per_guest' | 'per_guest_per_night';
  applies_to: 'all_guests' | 'adults_only' | 'children_only';
  subtotal: number;
}

// ============================================
// REPOSITORY INTERFACE
// ============================================

export interface IBookingWizardRepository {
  // ============================================
  // WEDDING GROUP METHODS
  // ============================================

  /**
   * Find wedding group by booking link (slug)
   */
  findWeddingByBookingLink(bookingLink: string): Promise<WeddingGroupBasicEntity | null>;

  // ============================================
  // ROOM BLOCK METHODS
  // ============================================

  /**
   * Get active room blocks for a wedding group with room type info
   */
  findRoomBlocksByWeddingId(weddingGroupId: number): Promise<RoomBlockEntity[]>;

  /**
   * Find room block by UUID
   */
  findRoomBlockByUuid(uuid: string): Promise<RoomBlockEntity | null>;

  /**
   * Find room block by ID
   */
  findRoomBlockById(id: number): Promise<RoomBlockEntity | null>;

  /**
   * Count booked rooms for overlapping dates
   */
  countBookedRoomsForDateRange(
    weddingGroupId: number,
    roomBlockId: number,
    checkIn: string,
    checkOut: string,
  ): Promise<number>;

  // ============================================
  // ADDON METHODS
  // ============================================

  /**
   * Get active addons for a wedding group
   */
  findAddonsByWeddingId(weddingGroupId: number): Promise<BookingWizardAddonEntity[]>;

  /**
   * Find addon by UUID
   */
  findAddonByUuid(uuid: string): Promise<BookingWizardAddonEntity | null>;

  // ============================================
  // GUEST METHODS
  // ============================================

  /**
   * Find guest by email and wedding group
   */
  findGuestByEmailAndWedding(email: string, weddingGroupId: number): Promise<BookingWizardGuestEntity | null>;

  /**
   * Find guest by access token
   */
  findGuestByAccessToken(accessToken: string): Promise<BookingWizardGuestEntity | null>;

  /**
   * Create a new guest
   */
  createGuest(data: CreateGuestData): Promise<BookingWizardGuestEntity>;

  /**
   * Update guest by ID
   */
  updateGuest(id: number, data: UpdateGuestData): Promise<void>;

  /**
   * Check if access token exists
   */
  isAccessTokenExists(token: string): Promise<boolean>;

  // ============================================
  // BOOKING METHODS
  // ============================================

  /**
   * Create a new booking
   */
  createBooking(data: CreateBookingData): Promise<BookingBasicEntity>;

  /**
   * Create booking room record
   */
  createBookingRoom(data: CreateBookingRoomData): Promise<BookingRoomEntity>;

  /**
   * Create booking addon record
   */
  createBookingAddon(data: CreateBookingAddonData): Promise<BookingAddonEntity>;

  /**
   * Check if booking reference exists
   */
  isBookingReferenceExists(reference: string): Promise<boolean>;

  /**
   * Find booking by reference
   */
  findBookingByReference(reference: string): Promise<BookingBasicEntity | null>;

  /**
   * Find booking by reference with guest
   */
  findBookingByReferenceWithGuest(reference: string): Promise<BookingBasicEntity | null>;

  /**
   * Get bookings for a guest
   */
  findBookingsByGuestId(guestId: number): Promise<BookingBasicEntity[]>;

  // ============================================
  // INVENTORY HOLD METHODS
  // ============================================

  /**
   * Create a new inventory hold
   */
  createHold(data: CreateHoldData): Promise<BookingHoldEntity>;

  /**
   * Find hold by UUID
   */
  findHoldByUuid(uuid: string): Promise<BookingHoldEntity | null>;

  /**
   * Find hold by checkout token
   */
  findHoldByCheckoutToken(checkoutToken: string): Promise<BookingHoldEntity | null>;

  /**
   * Find active holds for a guest session
   */
  findActiveHoldsForSession(guestSessionId: string): Promise<BookingHoldEntity[]>;

  /**
   * Count held rooms for date range (active + payment_pending holds)
   * Used for availability calculations
   */
  countHeldRoomsForDateRange(
    weddingGroupId: number,
    roomBlockId: number,
    checkIn: string,
    checkOut: string,
    excludeSessionId?: string,
  ): Promise<number>;

  /**
   * Update a hold
   */
  updateHold(id: number, data: UpdateHoldData): Promise<void>;

  /**
   * Release expired holds (cleanup job)
   * Returns number of holds released
   */
  releaseExpiredHolds(): Promise<number>;

  /**
   * Release holds for a session (user cancelled/abandoned)
   */
  releaseHoldsForSession(guestSessionId: string, reason: string): Promise<number>;

  /**
   * Convert holds to booking (after successful payment)
   */
  convertHoldsToBooking(guestSessionId: string, bookingId: number): Promise<number>;
}

/**
 * Repository token for dependency injection
 */
export const BOOKING_WIZARD_REPOSITORY = 'BOOKING_WIZARD_REPOSITORY';
