/**
 * ============================================
 * INVENTORY HOLD SERVICE
 * ============================================
 *
 * Service for managing inventory holds during the checkout process.
 * Prevents race conditions by temporarily reserving rooms while
 * guests complete their payment.
 *
 * Key features:
 * - 30-minute soft holds (configurable)
 * - Auto-release expired holds
 * - Convert holds to bookings on successful payment
 * - Session-based hold management
 */

import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import {
  IBookingWizardRepository,
  BOOKING_WIZARD_REPOSITORY,
  BookingHoldEntity,
  CreateHoldData,
} from 'src/core/repositories';

// Default hold duration in minutes
const DEFAULT_HOLD_DURATION_MINUTES = 30;
// Extended hold duration for payment processing
const PAYMENT_PENDING_DURATION_MINUTES = 15;

export interface CreateHoldInput {
  weddingGroupId: number;
  roomBlockId: number;
  quantity: number;
  guestSessionId: string;
  checkIn: string;
  checkOut: string;
}

export interface HoldResult {
  success: boolean;
  hold?: BookingHoldEntity;
  error?: string;
  availableRooms?: number;
}

@Injectable()
export class InventoryHoldService {
  private readonly logger = new Logger(InventoryHoldService.name);

  constructor(
    @Inject(BOOKING_WIZARD_REPOSITORY)
    private readonly repository: IBookingWizardRepository,
  ) {}

  /**
   * Create a new inventory hold for rooms
   * Called when user selects rooms and proceeds to checkout
   */
  async createHold(input: CreateHoldInput): Promise<HoldResult> {
    const {
      weddingGroupId,
      roomBlockId,
      quantity,
      guestSessionId,
      checkIn,
      checkOut,
    } = input;

    try {
      // First, release any existing holds for this session and room block
      // (in case user is changing their selection)
      await this.releaseSessionHoldsForBlock(guestSessionId, roomBlockId);

      // Get the room block to check allocation
      const roomBlock = await this.repository.findRoomBlockById(roomBlockId);

      if (!roomBlock) {
        return { success: false, error: 'Room block not found' };
      }

      // Calculate current availability
      // 1. Count confirmed bookings
      const bookedRooms = await this.repository.countBookedRoomsForDateRange(
        weddingGroupId,
        roomBlockId,
        checkIn,
        checkOut,
      );

      // 2. Count active holds (excluding this session)
      const heldRooms = await this.repository.countHeldRoomsForDateRange(
        weddingGroupId,
        roomBlockId,
        checkIn,
        checkOut,
        guestSessionId,
      );

      // 3. Calculate available
      const totalAllocated = roomBlock.rooms_allocated;
      const available = Math.max(0, totalAllocated - bookedRooms - heldRooms);

      // Check if requested quantity is available
      if (quantity > available) {
        return {
          success: false,
          error: 'Insufficient inventory',
          availableRooms: available,
        };
      }

      // Create the hold
      const now = new Date();
      const expiresAt = new Date(now.getTime() + DEFAULT_HOLD_DURATION_MINUTES * 60 * 1000);

      const holdData: CreateHoldData = {
        uuid: uuidv4(),
        wedding_group_id: weddingGroupId,
        room_block_id: roomBlockId,
        quantity,
        guest_session_id: guestSessionId,
        check_in_date: checkIn,
        check_out_date: checkOut,
        held_at: now,
        expires_at: expiresAt,
      };

      const hold = await this.repository.createHold(holdData);

      this.logger.log(
        `Created hold ${hold.uuid} for ${quantity} room(s), expires at ${expiresAt.toISOString()}`,
      );

      return { success: true, hold };
    } catch (error) {
      this.logger.error(`Failed to create hold: ${error.message}`, error.stack);
      return { success: false, error: 'Failed to create inventory hold' };
    }
  }

  /**
   * Release holds for a specific room block in a session
   */
  private async releaseSessionHoldsForBlock(
    guestSessionId: string,
    roomBlockId: number,
  ): Promise<void> {
    const holds = await this.repository.findActiveHoldsForSession(guestSessionId);

    for (const hold of holds) {
      if (hold.room_block_id === roomBlockId) {
        await this.repository.updateHold(hold.id, {
          status: 'released',
          release_reason: 'User changed selection',
          released_at: new Date(),
        });
      }
    }
  }

  /**
   * Create multiple holds for a booking (one per room block)
   */
  async createHoldsForBooking(
    weddingGroupId: number,
    guestSessionId: string,
    checkIn: string,
    checkOut: string,
    rooms: Array<{ roomBlockId: number; quantity: number }>,
  ): Promise<{ success: boolean; holds?: BookingHoldEntity[]; errors?: string[] }> {
    const holds: BookingHoldEntity[] = [];
    const errors: string[] = [];

    for (const room of rooms) {
      const result = await this.createHold({
        weddingGroupId,
        roomBlockId: room.roomBlockId,
        quantity: room.quantity,
        guestSessionId,
        checkIn,
        checkOut,
      });

      if (result.success && result.hold) {
        holds.push(result.hold);
      } else {
        errors.push(result.error || `Failed to hold room block ${room.roomBlockId}`);
      }
    }

    if (errors.length > 0) {
      // Rollback: release all holds created so far
      for (const hold of holds) {
        await this.repository.updateHold(hold.id, {
          status: 'released',
          release_reason: 'Rollback due to partial hold failure',
          released_at: new Date(),
        });
      }
      return { success: false, errors };
    }

    return { success: true, holds };
  }

  /**
   * Extend hold expiration (e.g., when user is actively on checkout page)
   */
  async extendHold(holdUuid: string, additionalMinutes: number = 15): Promise<boolean> {
    try {
      const hold = await this.repository.findHoldByUuid(holdUuid);

      if (!hold || hold.status !== 'active') {
        return false;
      }

      const newExpiry = new Date(
        Math.max(
          new Date(hold.expires_at).getTime(),
          Date.now(),
        ) + additionalMinutes * 60 * 1000,
      );

      await this.repository.updateHold(hold.id, {
        expires_at: newExpiry,
      });

      this.logger.log(`Extended hold ${holdUuid} to ${newExpiry.toISOString()}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to extend hold: ${error.message}`);
      return false;
    }
  }

  /**
   * Mark holds as payment pending (extends expiry for payment processing)
   */
  async markPaymentPending(
    guestSessionId: string,
    checkoutToken: string,
  ): Promise<boolean> {
    try {
      const holds = await this.repository.findActiveHoldsForSession(guestSessionId);

      if (holds.length === 0) {
        this.logger.warn(`No active holds found for session ${guestSessionId}`);
        return false;
      }

      const newExpiry = new Date(
        Date.now() + PAYMENT_PENDING_DURATION_MINUTES * 60 * 1000,
      );

      for (const hold of holds) {
        await this.repository.updateHold(hold.id, {
          status: 'payment_pending',
          checkout_token: checkoutToken,
          expires_at: newExpiry,
        });
      }

      this.logger.log(
        `Marked ${holds.length} hold(s) as payment_pending for session ${guestSessionId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to mark payment pending: ${error.message}`);
      return false;
    }
  }

  /**
   * Convert all holds for a session to a booking
   * Called after successful payment
   */
  async convertHoldsToBooking(
    guestSessionId: string,
    bookingId: number,
  ): Promise<number> {
    try {
      const converted = await this.repository.convertHoldsToBooking(
        guestSessionId,
        bookingId,
      );

      this.logger.log(
        `Converted ${converted} hold(s) to booking ${bookingId} for session ${guestSessionId}`,
      );

      return converted;
    } catch (error) {
      this.logger.error(`Failed to convert holds: ${error.message}`);
      return 0;
    }
  }

  /**
   * Release all holds for a session (user cancelled/abandoned checkout)
   */
  async releaseSessionHolds(guestSessionId: string, reason: string): Promise<number> {
    try {
      const released = await this.repository.releaseHoldsForSession(
        guestSessionId,
        reason,
      );

      this.logger.log(
        `Released ${released} hold(s) for session ${guestSessionId}: ${reason}`,
      );

      return released;
    } catch (error) {
      this.logger.error(`Failed to release holds: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get active holds for a session
   */
  async getSessionHolds(guestSessionId: string): Promise<BookingHoldEntity[]> {
    return this.repository.findActiveHoldsForSession(guestSessionId);
  }

  /**
   * Check if inventory is still available (including holds)
   * Used before creating a booking to double-check availability
   */
  async checkAvailabilityWithHolds(
    weddingGroupId: number,
    roomBlockId: number,
    checkIn: string,
    checkOut: string,
    requestedQuantity: number,
    excludeSessionId?: string,
  ): Promise<{ available: boolean; roomsAvailable: number }> {
    // Get room block
    const roomBlock = await this.repository.findRoomBlockByUuid(String(roomBlockId));

    if (!roomBlock) {
      return { available: false, roomsAvailable: 0 };
    }

    // Count booked rooms
    const bookedRooms = await this.repository.countBookedRoomsForDateRange(
      weddingGroupId,
      roomBlockId,
      checkIn,
      checkOut,
    );

    // Count held rooms (excluding current session if provided)
    const heldRooms = await this.repository.countHeldRoomsForDateRange(
      weddingGroupId,
      roomBlockId,
      checkIn,
      checkOut,
      excludeSessionId,
    );

    const totalAllocated = roomBlock.rooms_allocated;
    const roomsAvailable = Math.max(0, totalAllocated - bookedRooms - heldRooms);

    return {
      available: requestedQuantity <= roomsAvailable,
      roomsAvailable,
    };
  }

  /**
   * Cron job: Clean up expired holds every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupExpiredHolds(): Promise<void> {
    try {
      const released = await this.repository.releaseExpiredHolds();

      if (released > 0) {
        this.logger.log(`Cleanup: Released ${released} expired hold(s)`);
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup expired holds: ${error.message}`);
    }
  }

  /**
   * Get hold statistics (for monitoring/debugging)
   */
  async getHoldStats(): Promise<{
    activeHolds: number;
    paymentPendingHolds: number;
  }> {
    // This would need additional repository methods to implement properly
    // For now, return placeholder
    return {
      activeHolds: 0,
      paymentPendingHolds: 0,
    };
  }
}
