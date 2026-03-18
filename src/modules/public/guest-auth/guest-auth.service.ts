/**
 * ============================================
 * GUEST AUTH SERVICE
 * ============================================
 *
 * Service for guest authentication.
 * Handles login via access_token, email + booking_reference, or email + password.
 *
 * Uses repository abstraction to support both Sequelize and Supabase.
 */

import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  IGuestAuthRepository,
  GUEST_AUTH_REPOSITORY,
  GuestAuthEntity,
} from 'src/core/repositories';
import { getEnvironmentData, generateRandomString } from 'src/helpers/general';

@Injectable()
export class GuestAuthService {
  constructor(
    @Inject(GUEST_AUTH_REPOSITORY)
    private readonly repository: IGuestAuthRepository,
    private jwtService: JwtService,
    private mailService: MailerService,
  ) {}

  /**
   * GP-002: Login via access token (from invitation link)
   */
  async loginWithToken(
    accessToken: string,
  ): Promise<{ guest: GuestAuthEntity | null; error: string | null }> {
    const guest = await this.repository.findGuestByAccessToken(accessToken);

    if (!guest) {
      return { guest: null, error: 'invalid_token' };
    }

    // Check if wedding is active
    if (guest.wedding_group?.status !== 'active') {
      return { guest: null, error: 'wedding_not_active' };
    }

    return { guest, error: null };
  }

  /**
   * GP-002: Login via email and booking reference
   */
  async loginWithBookingReference(
    email: string,
    bookingReference: string,
  ): Promise<{ guest: GuestAuthEntity | null; error: string | null }> {
    // Find booking by reference with guest
    const booking = await this.repository.findBookingByReferenceAndEmail(
      bookingReference,
      email,
    );

    if (!booking || !booking.guest) {
      return { guest: null, error: 'invalid_credentials' };
    }

    // Check if wedding is active
    if (booking.guest.wedding_group?.status !== 'active') {
      return { guest: null, error: 'wedding_not_active' };
    }

    return { guest: booking.guest, error: null };
  }

  /**
   * GP-003: Generate JWT tokens for guest
   */
  generateTokens(guest: GuestAuthEntity): {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  } {
    const payload = {
      sub: guest.id,
      uuid: guest.uuid,
      type: 'guest', // Distinguish from admin tokens
      wedding_group_id: guest.wedding_group_id,
      token_id: uuidv4(),
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: getEnvironmentData('JWT_SECRET'),
      expiresIn: getEnvironmentData('JWT_ACCESS_TIME') || '24h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: getEnvironmentData('JWT_SECRET'),
      expiresIn: getEnvironmentData('JWT_REFRESH_TIME') || '7d',
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 86400, // 24 hours in seconds
    };
  }

  /**
   * Format guest response for login
   */
  formatGuestResponse(guest: GuestAuthEntity): any {
    return {
      uuid: guest.uuid,
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      status: guest.status,
      wedding: guest.wedding_group
        ? {
            uuid: guest.wedding_group.uuid,
            name: guest.wedding_group.name,
            booking_link: guest.wedding_group.booking_link,
          }
        : null,
    };
  }

  /**
   * GP-003: Get guest profile with full details
   * Returns bookings from ALL wedding groups where this email is registered
   */
  async getGuestProfile(guestId: number): Promise<any | null> {
    const guest = await this.repository.findGuestByIdWithRelations(guestId);

    if (!guest) {
      return null;
    }

    // Find all guests with the same email to get cross-wedding bookings
    const allGuests = await this.repository.findAllGuestsByEmail(guest.email);

    // Merge all bookings and weddings from all guest records
    const allBookings: any[] = [];
    const allWeddings: any[] = [];

    for (const g of allGuests) {
      // Only include from active weddings
      if (g.wedding_group?.status === 'active') {
        if (g.bookings && g.bookings.length > 0) {
          const bookingsWithWedding = g.bookings.map((booking) => ({
            uuid: booking.uuid,
            booking_reference: booking.booking_reference,
            check_in_date: booking.check_in_date,
            check_out_date: booking.check_out_date,
            total_rooms: booking.total_rooms,
            total_amount: Number(booking.total_amount),
            currency: booking.currency,
            status: booking.status,
            wedding_name: g.wedding_group?.name,
            wedding_booking_link: g.wedding_group?.booking_link,
          }));
          allBookings.push(...bookingsWithWedding);
        }
        if (g.wedding_group) {
          allWeddings.push({
            uuid: g.wedding_group.uuid,
            name: g.wedding_group.name,
            booking_link: g.wedding_group.booking_link,
            event_start_date: g.wedding_group.event_start_date,
            event_end_date: g.wedding_group.event_end_date,
            hotel: g.wedding_group.hotel
              ? {
                  uuid: g.wedding_group.hotel.uuid,
                  name: g.wedding_group.hotel.name,
                  city: g.wedding_group.hotel.city,
                  country: g.wedding_group.hotel.country,
                }
              : null,
          });
        }
      }
    }

    return {
      uuid: guest.uuid,
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      relationship: guest.relationship,
      side: guest.side,
      plus_ones_allowed: guest.plus_ones_allowed,
      status: guest.status,
      // Primary wedding (from the logged-in guest record)
      wedding: guest.wedding_group
        ? {
            uuid: guest.wedding_group.uuid,
            name: guest.wedding_group.name,
            booking_link: guest.wedding_group.booking_link,
            event_start_date: guest.wedding_group.event_start_date,
            event_end_date: guest.wedding_group.event_end_date,
            hotel: guest.wedding_group.hotel
              ? {
                  uuid: guest.wedding_group.hotel.uuid,
                  name: guest.wedding_group.hotel.name,
                  city: guest.wedding_group.hotel.city,
                  country: guest.wedding_group.hotel.country,
                }
              : null,
          }
        : null,
      // All weddings this guest is part of
      all_weddings: allWeddings,
      // All bookings across all weddings
      bookings: allBookings,
    };
  }

  /**
   * GP-003: Validate guest JWT token
   */
  async validateGuestToken(payload: any): Promise<any | null> {
    if (payload.type !== 'guest') {
      return null;
    }

    const guest = await this.repository.findGuestById(payload.sub);

    if (!guest || guest.status === 'declined') {
      return null;
    }

    return guest;
  }

  /**
   * Refresh guest token
   */
  async refreshToken(
    refreshToken: string,
  ): Promise<{ tokens: any; error: string | null }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: getEnvironmentData('JWT_SECRET'),
      });

      if (payload.type !== 'guest') {
        return { tokens: null, error: 'invalid_token' };
      }

      const guest = await this.repository.findGuestByIdWithRelations(payload.sub);

      if (!guest) {
        return { tokens: null, error: 'guest_not_found' };
      }

      const tokens = this.generateTokens(guest);
      return { tokens, error: null };
    } catch (error) {
      return { tokens: null, error: 'invalid_token' };
    }
  }

  /**
   * Update booking preferences (dietary, special requests)
   */
  async updateBookingPreferences(
    bookingUuid: string,
    guestId: number,
    specialRequests?: string,
  ): Promise<{ success: boolean; message?: string; data?: any }> {
    const result = await this.repository.updateBookingPreferences(
      bookingUuid,
      guestId,
      specialRequests,
    );
    return result;
  }

  // ============================================
  // PASSWORD-BASED AUTHENTICATION METHODS
  // ============================================

  /**
   * Login with email and password
   * Returns all bookings across all wedding groups for this email
   */
  async loginWithPassword(
    email: string,
    password: string,
  ): Promise<{ guest: GuestAuthEntity | null; error: string | null }> {
    // Find ALL guests with this email (across different wedding groups)
    const allGuests = await this.repository.findAllGuestsByEmail(email);

    if (!allGuests || allGuests.length === 0) {
      return { guest: null, error: 'invalid_credentials' };
    }

    // Find a guest with a password set and verify it
    let authenticatedGuest: GuestAuthEntity | null = null;
    for (const guest of allGuests) {
      if (guest.password) {
        const isValidPassword = await bcrypt.compare(password, guest.password);
        if (isValidPassword) {
          authenticatedGuest = guest;
          break;
        }
      }
    }

    if (!authenticatedGuest) {
      // Check if no password is set on any account
      const hasAnyPassword = allGuests.some((g) => g.password);
      if (!hasAnyPassword) {
        return { guest: null, error: 'no_password_set' };
      }
      return { guest: null, error: 'invalid_credentials' };
    }

    // Merge all bookings from all wedding groups into the authenticated guest
    const allBookings: any[] = [];
    const allWeddings: any[] = [];

    for (const guest of allGuests) {
      // Only include bookings from active weddings
      if (guest.wedding_group?.status === 'active') {
        if (guest.bookings && guest.bookings.length > 0) {
          // Add wedding info to each booking for display
          const bookingsWithWedding = guest.bookings.map((booking) => ({
            ...booking,
            wedding_name: guest.wedding_group?.name,
            wedding_booking_link: guest.wedding_group?.booking_link,
          }));
          allBookings.push(...bookingsWithWedding);
        }
        if (guest.wedding_group) {
          allWeddings.push({
            uuid: guest.wedding_group.uuid,
            name: guest.wedding_group.name,
            booking_link: guest.wedding_group.booking_link,
            event_start_date: guest.wedding_group.event_start_date,
            event_end_date: guest.wedding_group.event_end_date,
            hotel: guest.wedding_group.hotel,
          });
        }
      }
    }

    // Return authenticated guest with merged bookings
    const mergedGuest: GuestAuthEntity = {
      ...authenticatedGuest,
      bookings: allBookings,
      // Store all weddings for reference (optional)
      all_weddings: allWeddings,
    };

    return { guest: mergedGuest, error: null };
  }

  /**
   * Set password for guest (during booking or via UUID)
   */
  async setPasswordByGuestUuid(
    guestUuid: string,
    password: string,
  ): Promise<{ success: boolean; error: string | null }> {
    const guest = await this.repository.findGuestByUuid(guestUuid);

    if (!guest) {
      return { success: false, error: 'guest_not_found' };
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password
    const result = await this.repository.updateGuestPassword(
      guest.id,
      hashedPassword,
    );

    if (!result.success) {
      return { success: false, error: 'update_failed' };
    }

    return { success: true, error: null };
  }

  /**
   * Set password via email token link
   */
  async setPasswordByToken(
    token: string,
    email: string,
    password: string,
  ): Promise<{ success: boolean; error: string | null }> {
    const guest = await this.repository.findGuestBySetPasswordToken(token);

    if (!guest) {
      return { success: false, error: 'invalid_or_expired_token' };
    }

    // Verify email matches
    if (guest.email.toLowerCase() !== email.toLowerCase()) {
      return { success: false, error: 'email_mismatch' };
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password (this also clears the token)
    const result = await this.repository.updateGuestPassword(
      guest.id,
      hashedPassword,
    );

    if (!result.success) {
      return { success: false, error: 'update_failed' };
    }

    return { success: true, error: null };
  }

  /**
   * Request password reset (forgot password)
   */
  async forgotPassword(
    email: string,
  ): Promise<{ success: boolean; error: string | null }> {
    const guest = await this.repository.findGuestByEmail(email);

    if (!guest) {
      // Don't reveal if email exists for security
      return { success: true, error: null };
    }

    // Generate reset token
    const token = generateRandomString(64);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token
    await this.repository.setPasswordResetToken(guest.id, token, expiresAt);

    // Send email
    const frontendUrl = getEnvironmentData('GUEST_FRONTEND_URL') || getEnvironmentData('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/my-booking/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    try {
      await this.mailService.sendMail({
        to: email,
        subject: 'Reset Your Password',
        template: 'guest-reset-password',
        context: {
          guestName: guest.name,
          resetUrl: resetUrl,
          expireTime: '1 hour',
          appName: getEnvironmentData('APP_NAME'),
          logoUrl: getEnvironmentData('APP_LOGO_URL') || '',
          currentYear: new Date().getFullYear(),
        },
      });
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Still return success to not reveal email existence
    }

    return { success: true, error: null };
  }

  /**
   * Reset password with token
   */
  async resetPassword(
    token: string,
    email: string,
    password: string,
  ): Promise<{ success: boolean; error: string | null }> {
    const guest = await this.repository.findGuestByPasswordResetToken(token);

    if (!guest) {
      return { success: false, error: 'invalid_or_expired_token' };
    }

    // Verify email matches
    if (guest.email.toLowerCase() !== email.toLowerCase()) {
      return { success: false, error: 'email_mismatch' };
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password (this also clears the reset token)
    const result = await this.repository.updateGuestPassword(
      guest.id,
      hashedPassword,
    );

    if (!result.success) {
      return { success: false, error: 'update_failed' };
    }

    return { success: true, error: null };
  }

  /**
   * Generate and save set password token for guest (for email links)
   */
  async generateSetPasswordToken(
    guestId: number,
  ): Promise<{ token: string; error: string | null }> {
    const token = generateRandomString(64);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const result = await this.repository.setSetPasswordToken(
      guestId,
      token,
      expiresAt,
    );

    if (!result.success) {
      return { token: '', error: 'failed_to_generate_token' };
    }

    return { token, error: null };
  }

  /**
   * Check if guest has password set
   */
  async hasPasswordSet(email: string): Promise<boolean> {
    const guest = await this.repository.findGuestByEmail(email);
    return !!guest?.password;
  }

  /**
   * Validate set password token (for page display)
   */
  async validateSetPasswordToken(
    token: string,
  ): Promise<{ valid: boolean; email?: string; name?: string }> {
    const guest = await this.repository.findGuestBySetPasswordToken(token);

    if (!guest) {
      return { valid: false };
    }

    return {
      valid: true,
      email: guest.email,
      name: guest.name,
    };
  }

  /**
   * Validate password reset token (for page display)
   */
  async validateResetToken(
    token: string,
  ): Promise<{ valid: boolean; email?: string; name?: string }> {
    const guest = await this.repository.findGuestByPasswordResetToken(token);

    if (!guest) {
      return { valid: false };
    }

    return {
      valid: true,
      email: guest.email,
      name: guest.name,
    };
  }
}
