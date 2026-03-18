/**
 * ============================================
 * GUEST AUTH REPOSITORY INTERFACE
 * ============================================
 *
 * Domain-specific repository interface for guest authentication.
 * Handles guest login, profile retrieval, and session validation.
 *
 * Services use ONLY this interface, never the implementation.
 * This allows switching database providers without changing services.
 */

// ============================================
// ENTITY TYPES (Provider-agnostic)
// ============================================

export interface GuestAuthWeddingEntity {
  id: number;
  uuid: string;
  name: string;
  booking_link: string;
  event_start_date: string;
  event_end_date: string;
  status: string;
  hotel?: {
    uuid: string;
    name: string;
    city: string;
    country: string;
  };
}

export interface GuestAuthBookingEntity {
  id: number;
  uuid: string;
  booking_reference: string;
  check_in_date: string;
  check_out_date: string;
  total_rooms: number;
  total_amount: number;
  currency: string;
  status: string;
  // Optional wedding info (for cross-wedding view)
  wedding_name?: string;
  wedding_booking_link?: string;
}

export interface GuestAuthEntity {
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
  // Password fields for optional registration
  password?: string | null;
  password_set_at?: Date | null;
  password_reset_token?: string | null;
  password_reset_expires?: Date | null;
  set_password_token?: string | null;
  set_password_token_expires?: Date | null;
  wedding_group?: GuestAuthWeddingEntity;
  bookings?: GuestAuthBookingEntity[];
  // For cross-wedding login - all weddings this guest is part of
  all_weddings?: GuestAuthWeddingEntity[];
}

export interface GuestAuthBasicEntity {
  id: number;
  uuid: string;
  name: string;
  email: string;
  wedding_group_id: number;
  status: string;
}

export interface BookingWithGuestEntity {
  id: number;
  uuid: string;
  booking_reference: string;
  guest?: GuestAuthEntity;
}

// ============================================
// REPOSITORY INTERFACE
// ============================================

export interface IGuestAuthRepository {
  /**
   * Find guest by access token (for login via invitation link)
   */
  findGuestByAccessToken(accessToken: string): Promise<GuestAuthEntity | null>;

  /**
   * Find booking by reference with guest info and email match
   * (for login via email + booking reference)
   */
  findBookingByReferenceAndEmail(
    bookingReference: string,
    email: string,
  ): Promise<BookingWithGuestEntity | null>;

  /**
   * Find guest by ID (for token validation)
   */
  findGuestById(guestId: number): Promise<GuestAuthBasicEntity | null>;

  /**
   * Find guest by ID with wedding and bookings (for profile)
   */
  findGuestByIdWithRelations(guestId: number): Promise<GuestAuthEntity | null>;

  /**
   * Update booking preferences (dietary, special requests)
   */
  updateBookingPreferences(
    bookingUuid: string,
    guestId: number,
    specialRequests?: string,
  ): Promise<{ success: boolean; message?: string; data?: any }>;

  // ============================================
  // PASSWORD-BASED AUTHENTICATION METHODS
  // ============================================

  /**
   * Find guest by email (for password login) - returns first match
   */
  findGuestByEmail(email: string): Promise<GuestAuthEntity | null>;

  /**
   * Find ALL guests by email (for cross-wedding bookings view)
   * Returns all guest records with the same email across different wedding groups
   */
  findAllGuestsByEmail(email: string): Promise<GuestAuthEntity[]>;

  /**
   * Find guest by UUID (for set password during booking)
   */
  findGuestByUuid(uuid: string): Promise<GuestAuthEntity | null>;

  /**
   * Find guest by set password token (for email link)
   */
  findGuestBySetPasswordToken(token: string): Promise<GuestAuthEntity | null>;

  /**
   * Find guest by password reset token
   */
  findGuestByPasswordResetToken(token: string): Promise<GuestAuthEntity | null>;

  /**
   * Update guest password
   */
  updateGuestPassword(
    guestId: number,
    hashedPassword: string,
  ): Promise<{ success: boolean; message?: string }>;

  /**
   * Set password reset token for guest
   */
  setPasswordResetToken(
    guestId: number,
    token: string,
    expiresAt: Date,
  ): Promise<{ success: boolean; message?: string }>;

  /**
   * Clear password reset token after use
   */
  clearPasswordResetToken(guestId: number): Promise<{ success: boolean }>;

  /**
   * Set initial password setup token (for email link)
   */
  setSetPasswordToken(
    guestId: number,
    token: string,
    expiresAt: Date,
  ): Promise<{ success: boolean; message?: string }>;

  /**
   * Clear set password token after use
   */
  clearSetPasswordToken(guestId: number): Promise<{ success: boolean }>;
}

/**
 * Repository token for dependency injection
 */
export const GUEST_AUTH_REPOSITORY = 'GUEST_AUTH_REPOSITORY';
