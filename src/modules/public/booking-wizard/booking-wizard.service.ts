/**
 * ============================================
 * BOOKING WIZARD SERVICE
 * ============================================
 *
 * Service for the public booking wizard.
 * Handles date availability, room availability, pricing, etc.
 * No authentication required - used by guests for booking flow.
 *
 * Uses repository abstraction to support both Sequelize and Supabase.
 */

import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import {
  IBookingWizardRepository,
  BOOKING_WIZARD_REPOSITORY,
  WeddingGroupBasicEntity,
  RoomBlockEntity,
} from 'src/core/repositories';
import { InventoryHoldService } from './inventory-hold.service';
import { DateAvailabilityResponse } from './dto/check-availability.dto';
import { CreatePublicBookingDto } from './dto/create-booking.dto';
import { generateRandomString } from 'src/helpers/general';
import {
  calculateVariableRoomPrice,
  hasVariablePricing,
  PriceBreakdown,
} from 'src/helpers/variable-pricing.helper';
import { Payments } from '../../../models/Payments';
import { Bookings } from '../../../models/Bookings';
import { Guests } from '../../../models/Guests';
import { WeddingGroups } from '../../../models/WeddingGroups';
import { BookingRooms } from '../../../models/BookingRooms';
import { BookingAddons } from '../../../models/BookingAddons';
import { RoomTypes } from '../../../models/RoomTypes';
import { GroupAddons } from '../../../models/GroupAddons';
import { Hotels } from '../../../models/Hotels';
import { Invoices } from '../../../models/Invoices';
import { GroupItinerary } from '../../../models/GroupItinerary';
import {
  BookingConfirmationEmailService,
  BookingConfirmationData,
} from '../booking-confirmations/booking-confirmation-email.service';
import { EventsService } from '../../events/events.service';
import { EventType } from '../../events/event-types';

@Injectable()
export class BookingWizardService {
  private readonly logger = new Logger(BookingWizardService.name);

  constructor(
    @Inject(BOOKING_WIZARD_REPOSITORY)
    private readonly repository: IBookingWizardRepository,
    @Inject('PAYMENTS_REPOSITORY')
    private readonly paymentsRepository: typeof Payments,
    private readonly bookingConfirmationEmailService: BookingConfirmationEmailService,
    private readonly eventsService: EventsService,
    @Optional()
    private readonly inventoryHoldService?: InventoryHoldService,
  ) {}

  /**
   * BW-001: Check date availability for a wedding group
   * Validates that the requested dates are within the booking window
   * and meet minimum/maximum night requirements.
   */
  async checkDateAvailability(
    bookingLink: string,
    checkIn: string,
    checkOut: string,
  ): Promise<DateAvailabilityResponse | null> {
    // Find the wedding group by booking_link
    const wedding = await this.repository.findWeddingByBookingLink(bookingLink);

    if (!wedding) {
      return null;
    }

    // Parse dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    // booking_window_start = Earliest Check-In date (minimum check-in date guests can select)
    // booking_window_end = Booking Deadline (last day to make a reservation)
    const earliestCheckInAllowed = new Date(wedding.booking_window_start);
    const bookingDeadline = new Date(wedding.booking_window_end);
    const eventStartDate = new Date(wedding.event_start_date);
    const eventEndDate = new Date(wedding.event_end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate nights
    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Get min/max nights from room blocks (use the most restrictive)
    const roomBlocks = await this.repository.findRoomBlocksByWeddingId(wedding.id);

    // Find the minimum min_nights and maximum max_nights across all blocks
    let globalMinNights = 1;
    let globalMaxNights = 365; // Default max

    roomBlocks.forEach((block) => {
      if (block.min_nights && block.min_nights > globalMinNights) {
        globalMinNights = block.min_nights;
      }
      if (block.max_nights && block.max_nights < globalMaxNights) {
        globalMaxNights = block.max_nights;
      }
    });

    // Validation checks

    // 1. Is the booking window open? (Can users make reservations TODAY?)
    // Booking is open from when group is active until the deadline
    // Note: We don't check "today >= earliestCheckInAllowed" because guests should be able to
    // book NOW for a FUTURE check-in date.
    const isBookingOpen =
      today <= bookingDeadline &&
      wedding.status === 'active';

    // 2. Calculate earliest allowed check-in
    // Use the configured earliest check-in date from the wedding group
    const earliestCheckIn = new Date(earliestCheckInAllowed);

    // 3. Valid check-in: must be between earliest allowed and event start date (wedding day)
    const checkInValid = checkInDate >= earliestCheckIn && checkInDate <= eventStartDate;

    // 4. Valid check-out:
    //    - Must be after check-in
    //    - Must be on or before event end date
    //    - Must be on or after event start date + 1 day (guest must stay at least the first night of event)
    const minCheckOutDate = new Date(eventStartDate);
    minCheckOutDate.setDate(minCheckOutDate.getDate() + 1); // Day after event starts

    const checkOutValid =
      checkOutDate > checkInDate &&
      checkOutDate <= eventEndDate &&
      checkOutDate >= minCheckOutDate;

    // 5. Minimum nights validation
    const minNightsMet = nights >= globalMinNights;

    // 6. Maximum nights validation
    const maxNightsMet = nights <= globalMaxNights;

    // Collect errors
    const errors: string[] = [];

    if (!isBookingOpen) {
      if (wedding.status !== 'active') {
        errors.push('This wedding is not currently accepting bookings');
      } else if (today > bookingDeadline) {
        errors.push('The booking deadline has passed');
      }
    }

    if (!checkInValid) {
      const earliestCheckInStr = earliestCheckIn.toISOString().split('T')[0];
      errors.push(
        `Check-in must be between ${earliestCheckInStr} and ${wedding.event_start_date} (wedding day)`,
      );
    }

    if (!checkOutValid) {
      if (checkOutDate <= checkInDate) {
        errors.push('Check-out date must be after check-in date');
      } else if (checkOutDate < minCheckOutDate) {
        const minCheckOutStr = minCheckOutDate.toISOString().split('T')[0];
        errors.push(
          `Check-out must be on or after ${minCheckOutStr} to ensure you're present for the event`,
        );
      } else {
        errors.push(
          `Check-out must be on or before ${wedding.event_end_date}`,
        );
      }
    }

    if (!minNightsMet) {
      errors.push(`Minimum stay is ${globalMinNights} night(s)`);
    }

    if (!maxNightsMet) {
      errors.push(`Maximum stay is ${globalMaxNights} night(s)`);
    }

    const isAvailable =
      isBookingOpen &&
      checkInValid &&
      checkOutValid &&
      minNightsMet &&
      maxNightsMet;

    return {
      is_available: isAvailable,
      booking_window: {
        start: wedding.booking_window_start,
        end: wedding.booking_window_end,
      },
      event_dates: {
        start: wedding.event_start_date,
        end: wedding.event_end_date,
      },
      stay_dates: {
        earliest_check_in: earliestCheckIn.toISOString().split('T')[0],
        latest_check_in: wedding.event_start_date,
        earliest_check_out: minCheckOutDate.toISOString().split('T')[0],
        latest_check_out: wedding.event_end_date,
      },
      requested_dates: {
        check_in: checkIn,
        check_out: checkOut,
        nights,
      },
      validation: {
        booking_is_open: isBookingOpen,
        check_in_valid: checkInValid,
        check_out_valid: checkOutValid,
        min_nights_met: minNightsMet,
        max_nights_met: maxNightsMet,
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * BW-015: Check if guest exists and has password
   * Used to determine whether to show password creation option in booking flow
   */
  async checkGuestStatus(
    bookingLink: string,
    email: string,
  ): Promise<{ exists: boolean; has_password: boolean } | null> {
    // Find the wedding group
    const wedding = await this.repository.findWeddingByBookingLink(bookingLink);

    if (!wedding) {
      return null;
    }

    // Find guest by email and wedding
    const guest = await this.repository.findGuestByEmailAndWedding(
      email.toLowerCase(),
      wedding.id,
    );

    if (!guest) {
      return {
        exists: false,
        has_password: false,
      };
    }

    return {
      exists: true,
      has_password: !!guest.password,
    };
  }

  /**
   * BW-002: Get room availability for specific dates
   * Returns available rooms with real-time inventory check.
   * Now includes held rooms in availability calculation.
   */
  async getRoomAvailability(
    bookingLink: string,
    checkIn: string,
    checkOut: string,
    guestSessionId?: string, // Optional: exclude this session's holds from calculation
  ): Promise<any | null> {
    // Find the wedding group
    const wedding = await this.repository.findWeddingByBookingLink(bookingLink);

    if (!wedding) {
      return null;
    }

    // Get room blocks with room type info
    const roomBlocks = await this.repository.findRoomBlocksByWeddingId(wedding.id);

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // For each room block, calculate actual availability
    // considering existing bookings AND active holds for the same dates
    const availableRooms = await Promise.all(
      roomBlocks.map(async (block) => {
        // Count rooms already booked for overlapping dates
        const bookedRoomsCount = await this.repository.countBookedRoomsForDateRange(
          wedding.id,
          block.id,
          checkIn,
          checkOut,
        );

        // Count rooms currently held by other users (BW-027/BW-028: Inventory Hold System)
        let heldRoomsCount = 0;
        try {
          heldRoomsCount = await this.repository.countHeldRoomsForDateRange(
            wedding.id,
            block.id,
            checkIn,
            checkOut,
            guestSessionId, // Exclude current session's holds
          );
        } catch (error) {
          // If hold counting fails, continue without it (backward compatibility)
          this.logger.warn(`Failed to count held rooms: ${error.message}`);
        }

        const totalAllocated = block.rooms_allocated;
        const currentlyBooked = bookedRoomsCount;
        const currentlyHeld = heldRoomsCount;
        const available = Math.max(0, totalAllocated - currentlyBooked - currentlyHeld);

        // Check if nights meet this block's requirements
        const meetsMinNights = !block.min_nights || nights >= block.min_nights;
        const meetsMaxNights = !block.max_nights || nights <= block.max_nights;

        // Calculate variable pricing if available
        const blockPricing = {
          price_per_night: Number(block.price_per_night),
          price_type: (block.price_type as 'per_room' | 'per_person') || 'per_room',
          rate_sun_wed: block.rate_sun_wed ? Number(block.rate_sun_wed) : null,
          rate_thu_sat: block.rate_thu_sat ? Number(block.rate_thu_sat) : null,
          base_occupancy: block.base_occupancy || 2,
          extra_adult_per_night: block.extra_adult_per_night ? Number(block.extra_adult_per_night) : null,
          extra_child_per_night: block.extra_child_per_night !== null ? Number(block.extra_child_per_night) : null,
          extra_teen_per_night: block.extra_teen_per_night !== null ? Number(block.extra_teen_per_night) : null,
        };

        // Calculate total price with variable pricing (base occupancy only, no extra persons)
        const priceResult = calculateVariableRoomPrice(
          checkIn,
          checkOut,
          blockPricing,
          blockPricing.base_occupancy, // Use base occupancy for initial calculation
          0, // No children for initial calculation
          0, // No teens for initial calculation
        );

        return {
          block_id: block.id, // For inventory hold system (BW-027/BW-028)
          block_uuid: block.uuid,
          rooms_allocated: totalAllocated,
          rooms_booked: currentlyBooked,
          rooms_held: currentlyHeld, // BW-027: Include held rooms for transparency
          rooms_available: available,
          is_available: available > 0 && meetsMinNights && meetsMaxNights,
          // Legacy single price (for backward compatibility)
          price_per_night: Number(block.price_per_night),
          total_price: priceResult.total,
          // Pricing mode: 'per_room' or 'per_person'
          price_type: blockPricing.price_type || 'per_room',
          // Variable pricing fields
          rate_sun_wed: blockPricing.rate_sun_wed,
          rate_thu_sat: blockPricing.rate_thu_sat,
          base_occupancy: blockPricing.base_occupancy,
          extra_adult_per_night: blockPricing.extra_adult_per_night,
          extra_child_per_night: blockPricing.extra_child_per_night,
          extra_teen_per_night: blockPricing.extra_teen_per_night,
          has_variable_pricing: hasVariablePricing(blockPricing),
          // Nightly breakdown for display
          price_breakdown: priceResult.breakdown,
          min_nights: block.min_nights,
          max_nights: block.max_nights,
          meets_min_nights: meetsMinNights,
          meets_max_nights: meetsMaxNights,
          room_type: block.room_type
            ? {
                uuid: block.room_type.uuid,
                name: block.room_type.name,
                slug: block.room_type.slug,
                description: block.room_type.description,
                bed_type: block.room_type.bed_type,
                room_size: block.room_type.room_size,
                max_occupancy: block.room_type.max_occupancy,
                max_adults: block.room_type.max_adults,
                max_children: block.room_type.max_children,
                amenities: block.room_type.amenities,
                image_url: block.room_type.image_url,
                gallery_images: block.room_type.gallery_images,
              }
            : null,
        };
      }),
    );

    return {
      wedding_id: wedding.id, // For inventory hold system (BW-027/BW-028)
      wedding_uuid: wedding.uuid,
      wedding_name: wedding.name,
      check_in: checkIn,
      check_out: checkOut,
      nights,
      rooms: availableRooms,
      summary: {
        total_room_types: availableRooms.length,
        available_room_types: availableRooms.filter((r) => r.is_available).length,
        total_rooms_available: availableRooms.reduce(
          (sum, r) => sum + r.rooms_available,
          0,
        ),
      },
    };
  }

  /**
   * Helper: Get guest count based on applies_to setting
   * Used for per_guest and per_guest_per_night pricing
   */
  private getGuestCountForAddon(
    appliesTo: 'all_guests' | 'adults_only' | 'children_only' | undefined,
    totalAdults: number,
    totalChildren: number,
  ): number {
    switch (appliesTo) {
      case 'adults_only':
        return totalAdults;
      case 'children_only':
        return totalChildren;
      case 'all_guests':
      default:
        return totalAdults + totalChildren;
    }
  }

  /**
   * BW-013: Calculate price breakdown for a booking
   * Returns detailed line-item breakdown including rooms, addons, and totals.
   */
  async calculatePriceBreakdown(
    bookingLink: string,
    checkIn: string,
    checkOut: string,
    rooms: Array<{ block_uuid: string; quantity: number }>,
    addons?: Array<{ addon_uuid: string; quantity: number }>,
    totalAdults?: number,
    totalChildren?: number,
  ): Promise<any | null> {
    // Find the wedding group
    const wedding = await this.repository.findWeddingByBookingLink(bookingLink);

    if (!wedding) {
      return null;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Get room blocks
    const roomBlocks = await this.repository.findRoomBlocksByWeddingId(wedding.id);

    // Calculate room costs with variable pricing
    const roomLineItems: any[] = [];
    let roomsSubtotal = 0;
    let totalExtraPersonCharges = 0;

    for (const roomSelection of rooms) {
      const block = roomBlocks.find((b) => b.uuid === roomSelection.block_uuid);
      if (block) {
        // Build block pricing object
        const blockPricing = {
          price_per_night: Number(block.price_per_night),
          price_type: (block.price_type as 'per_room' | 'per_person') || 'per_room',
          rate_sun_wed: block.rate_sun_wed ? Number(block.rate_sun_wed) : null,
          rate_thu_sat: block.rate_thu_sat ? Number(block.rate_thu_sat) : null,
          base_occupancy: block.base_occupancy || 2,
          extra_adult_per_night: block.extra_adult_per_night ? Number(block.extra_adult_per_night) : null,
          extra_child_per_night: block.extra_child_per_night !== null ? Number(block.extra_child_per_night) : null,
          extra_teen_per_night: block.extra_teen_per_night !== null ? Number(block.extra_teen_per_night) : null,
        };

        let totalForRoom: number;
        let extraChargesForRoom: number;
        let priceResult: any;

        if (blockPricing.price_type === 'per_person') {
          // PER-PERSON PRICING: Always charge for room capacity (rooms × base_occupancy)
          // Industry standard: Each room has minimum occupancy charge
          const actualAdults = totalAdults || 2;
          const actualChildren = totalChildren || 0;
          const actualGuests = actualAdults + actualChildren;
          const roomCapacity = roomSelection.quantity * blockPricing.base_occupancy;

          // Calculate billable guests: always room capacity
          // Phantom guests (empty beds) are charged at adult rate
          let billableAdults = actualAdults;
          let billableChildren = actualChildren;

          if (roomCapacity > actualGuests) {
            // There are empty beds - charge as phantom adults
            const phantomGuests = roomCapacity - actualGuests;
            billableAdults = actualAdults + phantomGuests;
          }

          priceResult = calculateVariableRoomPrice(
            checkIn,
            checkOut,
            blockPricing,
            billableAdults,
            billableChildren,
            0, // teens (not tracked separately yet)
          );

          // For per-person pricing, DON'T multiply by room quantity
          // The price is already calculated for all billable guests
          totalForRoom = priceResult.total;
          extraChargesForRoom = priceResult.breakdown.extra_person_total;
        } else {
          // PER-ROOM PRICING: Calculate per room and multiply by quantity
          const adultsPerRoom = (roomSelection as any).adults || blockPricing.base_occupancy;
          const childrenPerRoom = (roomSelection as any).children || 0;
          const teensPerRoom = (roomSelection as any).teens || 0;

          priceResult = calculateVariableRoomPrice(
            checkIn,
            checkOut,
            blockPricing,
            adultsPerRoom,
            childrenPerRoom,
            teensPerRoom,
          );

          // Multiply by quantity for total (per-room pricing)
          totalForRoom = priceResult.total * roomSelection.quantity;
          extraChargesForRoom = priceResult.breakdown.extra_person_total * roomSelection.quantity;
        }

        roomsSubtotal += totalForRoom;
        totalExtraPersonCharges += extraChargesForRoom;

        // Determine display values based on pricing type
        const displayAdults = blockPricing.price_type === 'per_person' ? (totalAdults || 2) : ((roomSelection as any).adults || blockPricing.base_occupancy);
        const displayChildren = blockPricing.price_type === 'per_person' ? (totalChildren || 0) : ((roomSelection as any).children || 0);
        const displayTeens = blockPricing.price_type === 'per_person' ? 0 : ((roomSelection as any).teens || 0);

        roomLineItems.push({
          block_uuid: block.uuid,
          room_type_name: block.room_type?.name || 'Room',
          quantity: roomSelection.quantity,
          nights,
          // Legacy price (for backward compatibility)
          price_per_night: Number(block.price_per_night),
          // Variable pricing
          rate_sun_wed: blockPricing.rate_sun_wed,
          rate_thu_sat: blockPricing.rate_thu_sat,
          has_variable_pricing: hasVariablePricing(blockPricing),
          price_type: blockPricing.price_type,
          // Occupancy
          adults: displayAdults,
          children: displayChildren,
          teens: displayTeens,
          base_occupancy: blockPricing.base_occupancy,
          // Charges
          extra_person_charges: extraChargesForRoom,
          room_total: blockPricing.price_type === 'per_person'
            ? priceResult.breakdown.room_total
            : priceResult.breakdown.room_total * roomSelection.quantity,
          line_total: totalForRoom,
          // Detailed breakdown (for single room)
          price_breakdown: priceResult.breakdown,
        });
      }
    }

    // Calculate addon costs (if any)
    const addonLineItems: any[] = [];
    let addonsSubtotal = 0;

    // Default guest counts
    const adults = totalAdults || 2;
    const children = totalChildren || 0;

    if (addons && addons.length > 0) {
      const groupAddons = await this.repository.findAddonsByWeddingId(wedding.id);

      for (const addonSelection of addons) {
        const addon = groupAddons.find((a) => a.uuid === addonSelection.addon_uuid);
        if (addon) {
          const addonPrice = Number(addon.price);
          // Get guest count based on applies_to setting
          const guestCount = this.getGuestCountForAddon(addon.applies_to, adults, children);
          let lineTotal = addonPrice * addonSelection.quantity;

          // Calculate based on pricing_type
          switch (addon.pricing_type) {
            case 'per_night':
              lineTotal *= nights;
              break;
            case 'per_guest':
              lineTotal *= guestCount;
              break;
            case 'per_guest_per_night':
              lineTotal *= guestCount * nights;
              break;
            case 'per_stay':
            default:
              // Flat fee, no multiplier needed
              break;
          }

          addonsSubtotal += lineTotal;

          addonLineItems.push({
            addon_uuid: addon.uuid,
            addon_name: addon.name,
            addon_type: addon.addon_type,
            quantity: addonSelection.quantity,
            price_per_unit: addonPrice,
            pricing_type: addon.pricing_type,
            applies_to: addon.applies_to || 'all_guests',
            nights: ['per_night', 'per_guest_per_night'].includes(addon.pricing_type) ? nights : null,
            guests: ['per_guest', 'per_guest_per_night'].includes(addon.pricing_type) ? guestCount : null,
            line_total: lineTotal,
          });
        }
      }
    }

    const subtotal = roomsSubtotal + addonsSubtotal;

    // Calculate taxes using wedding group's tax rate
    const taxRate = Number(wedding.tax_rate) || 0;
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = subtotal + taxAmount;

    // Calculate deposit on TOTAL (including taxes) - industry standard
    // Pass total guests for per_person deposit calculation
    const totalGuests = adults + children;
    const depositInfo = this.calculateDeposit(
      total,
      wedding.deposit_type,
      Number(wedding.deposit_value),
      totalGuests,
    );

    return {
      wedding_uuid: wedding.uuid,
      wedding_name: wedding.name,
      check_in: checkIn,
      check_out: checkOut,
      nights,
      line_items: {
        rooms: roomLineItems,
        addons: addonLineItems,
      },
      pricing: {
        rooms_subtotal: roomsSubtotal,
        extra_person_charges: totalExtraPersonCharges,
        addons_subtotal: addonsSubtotal,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        deposit: depositInfo,
        balance_due: total - depositInfo.amount,
        currency: wedding.currency_code || 'USD',
      },
      payment_schedule: {
        deposit_due_now: depositInfo.amount,
        balance_due_by: this.calculateBalanceDueDate(
          wedding.event_start_date,
          wedding.final_payment_due_days,
        ),
        balance_amount: total - depositInfo.amount,
      },
    };
  }

  /**
   * BW-014: Calculate deposit amount
   * Helper method to calculate deposit based on type and value.
   */
  calculateDeposit(
    totalAmount: number,
    depositType: string,
    depositValue: number,
    totalGuests?: number, // Required for per_person deposits
  ): { type: string; value: number; amount: number } {
    let depositAmount: number;

    if (depositType === 'percentage') {
      depositAmount = (totalAmount * depositValue) / 100;
    } else if (depositType === 'per_person') {
      // Per-person deposit: amount × total number of guests
      const guests = totalGuests || 2; // Default to 2 if not provided
      depositAmount = depositValue * guests;
      depositAmount = Math.min(depositAmount, totalAmount); // Can't exceed total
    } else {
      // Fixed amount
      depositAmount = Math.min(depositValue, totalAmount); // Can't exceed total
    }

    // Round to 2 decimal places
    depositAmount = Math.round(depositAmount * 100) / 100;

    return {
      type: depositType,
      value: depositValue,
      amount: depositAmount,
    };
  }

  /**
   * Calculate the date when balance is due
   */
  private calculateBalanceDueDate(
    eventStartDate: string,
    daysBeforeEvent: number,
  ): string {
    const eventDate = new Date(eventStartDate);
    eventDate.setDate(eventDate.getDate() - daysBeforeEvent);
    return eventDate.toISOString().split('T')[0];
  }

  /**
   * BW-014: Get deposit calculation for a wedding group
   * Returns deposit configuration and calculation for a given amount.
   */
  async getDepositInfo(
    bookingLink: string,
    totalAmount?: number,
    totalGuests?: number, // Required for per_person deposits
  ): Promise<any | null> {
    const wedding = await this.repository.findWeddingByBookingLink(bookingLink);

    if (!wedding) {
      return null;
    }

    const depositType = wedding.deposit_type;
    const depositValue = Number(wedding.deposit_value);

    // If totalAmount provided, calculate actual deposit
    const calculatedDeposit = totalAmount
      ? this.calculateDeposit(totalAmount, depositType, depositValue, totalGuests)
      : null;

    // Generate appropriate description based on deposit type
    let depositDescription: string;
    if (depositType === 'percentage') {
      depositDescription = `${depositValue}% of total booking amount`;
    } else if (depositType === 'per_person') {
      depositDescription = `$${depositValue} per person`;
    } else {
      depositDescription = `Fixed amount of $${depositValue}`;
    }

    return {
      wedding_uuid: wedding.uuid,
      deposit_config: {
        type: depositType,
        value: depositValue,
        description: depositDescription,
      },
      final_payment_due_days: wedding.final_payment_due_days,
      balance_due_date: this.calculateBalanceDueDate(
        wedding.event_start_date,
        wedding.final_payment_due_days,
      ),
      calculated: calculatedDeposit
        ? {
            total_amount: totalAmount,
            deposit_amount: calculatedDeposit.amount,
            balance_amount: totalAmount - calculatedDeposit.amount,
          }
        : null,
    };
  }

  /**
   * BW-008: Get available addons for a wedding group
   * Returns all active addons for the specified wedding.
   */
  async getAvailableAddons(bookingLink: string): Promise<any | null> {
    const wedding = await this.repository.findWeddingByBookingLink(bookingLink);

    if (!wedding) {
      return null;
    }

    const addons = await this.repository.findAddonsByWeddingId(wedding.id);

    return {
      wedding_uuid: wedding.uuid,
      addons: addons.map((addon) => ({
        uuid: addon.uuid,
        name: addon.name,
        description: addon.description,
        addon_type: addon.addon_type,
        price: Number(addon.price),
        pricing_type: addon.pricing_type,
        applies_to: addon.applies_to || 'all_guests',
        max_quantity: addon.max_quantity,
      })),
      summary: {
        total_addons: addons.length,
        by_type: addons.reduce((acc: Record<string, number>, addon) => {
          acc[addon.addon_type] = (acc[addon.addon_type] || 0) + 1;
          return acc;
        }, {}),
      },
    };
  }

  /**
   * BW-030: Generate unique booking reference
   * Format: BK-YYYY-XXXXXX (e.g., BK-2026-A1B2C3)
   */
  async generateBookingReference(): Promise<string> {
    const year = new Date().getFullYear();
    let reference: string;
    let exists = true;

    // Keep generating until we find a unique reference
    while (exists) {
      const randomPart = generateRandomString(6).toUpperCase();
      reference = `BK-${year}-${randomPart}`;
      exists = await this.repository.isBookingReferenceExists(reference);
    }

    return reference!;
  }

  /**
   * Generate unique guest access token
   */
  async generateGuestAccessToken(): Promise<string> {
    let token: string;
    let exists = true;

    while (exists) {
      token = generateRandomString(32);
      exists = await this.repository.isAccessTokenExists(token);
    }

    return token!;
  }

  /**
   * BW-031: Create a booking from the public wizard
   * Creates guest record, booking record, and associated rooms/addons.
   */
  async createBooking(
    bookingLink: string,
    data: CreatePublicBookingDto,
  ): Promise<any | null> {
    // Find the wedding group
    const wedding = await this.repository.findWeddingByBookingLink(bookingLink);

    if (!wedding) {
      return { error: 'wedding_not_found' };
    }

    // Validate wedding is active
    if (wedding.status !== 'active') {
      return { error: 'wedding_not_active' };
    }

    // Calculate nights
    const checkInDate = new Date(data.check_in);
    const checkOutDate = new Date(data.check_out);
    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Get room blocks for validation and pricing
    const roomBlocks = await this.repository.findRoomBlocksByWeddingId(wedding.id);

    // Calculate total rooms and pricing with variable pricing support
    let totalRooms = 0;
    let roomsTotal = 0;
    const roomDetails: Array<{
      block: RoomBlockEntity;
      quantity: number;
      pricePerNight: number;
      total: number;
      adults: number;
      children: number;
      teens: number;
      extraPersonCharges: number;
      priceBreakdown: PriceBreakdown | null;
    }> = [];

    for (const roomSelection of data.rooms) {
      const block = roomBlocks.find((b) => b.uuid === roomSelection.block_uuid);
      if (!block) {
        return { error: 'invalid_room_block', block_uuid: roomSelection.block_uuid };
      }

      // Check availability
      const bookedCount = await this.repository.countBookedRoomsForDateRange(
        wedding.id,
        block.id,
        data.check_in,
        data.check_out,
      );

      const available = block.rooms_allocated - bookedCount;
      if (roomSelection.quantity > available) {
        return {
          error: 'insufficient_inventory',
          block_uuid: roomSelection.block_uuid,
          requested: roomSelection.quantity,
          available,
        };
      }

      // Build block pricing object for variable pricing calculation
      const blockPricing = {
        price_per_night: Number(block.price_per_night),
        price_type: (block.price_type as 'per_room' | 'per_person') || 'per_room',
        rate_sun_wed: block.rate_sun_wed ? Number(block.rate_sun_wed) : null,
        rate_thu_sat: block.rate_thu_sat ? Number(block.rate_thu_sat) : null,
        base_occupancy: block.base_occupancy || 2,
        extra_adult_per_night: block.extra_adult_per_night ? Number(block.extra_adult_per_night) : null,
        extra_child_per_night: block.extra_child_per_night !== null ? Number(block.extra_child_per_night) : null,
        extra_teen_per_night: block.extra_teen_per_night !== null ? Number(block.extra_teen_per_night) : null,
      };

      let totalForRoom: number;
      let extraCharges: number;
      let priceResult: any;
      let displayAdults: number;
      let displayChildren: number;
      let displayTeens: number;

      if (blockPricing.price_type === 'per_person') {
        // PER-PERSON PRICING: Always charge for room capacity (rooms × base_occupancy)
        // Industry standard: Each room has minimum occupancy charge
        const actualAdults = data.total_adults || 2;
        const actualChildren = data.total_children || 0;
        const actualGuests = actualAdults + actualChildren;
        const roomCapacity = roomSelection.quantity * blockPricing.base_occupancy;

        // Calculate billable guests: always room capacity
        // Phantom guests (empty beds) are charged at adult rate
        let billableAdults = actualAdults;
        let billableChildren = actualChildren;

        if (roomCapacity > actualGuests) {
          // There are empty beds - charge as phantom adults
          const phantomGuests = roomCapacity - actualGuests;
          billableAdults = actualAdults + phantomGuests;
        }

        priceResult = calculateVariableRoomPrice(
          data.check_in,
          data.check_out,
          blockPricing,
          billableAdults,
          billableChildren,
          0, // teens
        );

        // For per-person pricing, DON'T multiply by room quantity
        // The price is already calculated for all billable guests
        totalForRoom = priceResult.total;
        extraCharges = priceResult.breakdown.extra_person_total;
        displayAdults = billableAdults; // Show billable adults (includes phantom)
        displayChildren = actualChildren;
        displayTeens = 0;
      } else {
        // PER-ROOM PRICING: Calculate per room and multiply by quantity
        const adultsPerRoom = (roomSelection as any).adults || data.total_adults || 2;
        const childrenPerRoom = (roomSelection as any).children || 0;
        const teensPerRoom = (roomSelection as any).teens || 0;

        priceResult = calculateVariableRoomPrice(
          data.check_in,
          data.check_out,
          blockPricing,
          adultsPerRoom,
          childrenPerRoom,
          teensPerRoom,
        );

        // Multiply by quantity for total (per-room pricing)
        totalForRoom = priceResult.total * roomSelection.quantity;
        extraCharges = priceResult.breakdown.extra_person_total * roomSelection.quantity;
        displayAdults = adultsPerRoom;
        displayChildren = childrenPerRoom;
        displayTeens = teensPerRoom;
      }

      totalRooms += roomSelection.quantity;
      roomsTotal += totalForRoom;
      roomDetails.push({
        block,
        quantity: roomSelection.quantity,
        pricePerNight: Number(block.price_per_night),
        total: totalForRoom,
        adults: displayAdults,
        children: displayChildren,
        teens: displayTeens,
        extraPersonCharges: extraCharges,
        priceBreakdown: hasVariablePricing(blockPricing) ? priceResult.breakdown : null,
      });
    }

    // Calculate addons total
    let addonsTotal = 0;
    const addonDetails: Array<{
      addon: any;
      quantity: number;
      price: number;
      total: number;
      appliesTo: 'all_guests' | 'adults_only' | 'children_only';
    }> = [];

    // Get total guests for deposit and addon calculations
    const totalAdults = data.total_adults || 2;
    const totalChildren = data.total_children || 0;
    const totalGuests = totalAdults + totalChildren;

    if (data.addons && data.addons.length > 0) {
      const groupAddons = await this.repository.findAddonsByWeddingId(wedding.id);

      for (const addonSelection of data.addons) {
        const addon = groupAddons.find((a) => a.uuid === addonSelection.addon_uuid);
        if (!addon) {
          return { error: 'invalid_addon', addon_uuid: addonSelection.addon_uuid };
        }

        const price = Number(addon.price);
        // Get guest count based on applies_to setting
        const guestCount = this.getGuestCountForAddon(addon.applies_to, totalAdults, totalChildren);
        let total = price * addonSelection.quantity;

        // Calculate based on pricing_type
        switch (addon.pricing_type) {
          case 'per_night':
            total *= nights;
            break;
          case 'per_guest':
            total *= guestCount;
            break;
          case 'per_guest_per_night':
            total *= guestCount * nights;
            break;
          case 'per_stay':
          default:
            // Flat fee, no multiplier needed
            break;
        }

        addonsTotal += total;
        addonDetails.push({
          addon,
          quantity: addonSelection.quantity,
          price,
          total,
          appliesTo: (addon.applies_to || 'all_guests') as 'all_guests' | 'adults_only' | 'children_only',
        });
      }
    }

    // Calculate totals with taxes
    const subtotal = roomsTotal + addonsTotal;
    const taxRate = Number(wedding.tax_rate) || 0;
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const totalWithTax = subtotal + taxAmount;

    // Calculate deposit on TOTAL (including taxes) - industry standard
    // Pass total guests for per_person deposit calculation
    const depositInfo = this.calculateDeposit(
      totalWithTax,
      wedding.deposit_type,
      Number(wedding.deposit_value),
      totalGuests,
    );

    // Find or create guest
    let guest = await this.repository.findGuestByEmailAndWedding(
      data.guest.email.toLowerCase(),
      wedding.id,
    );

    const guestAccessToken = await this.generateGuestAccessToken();

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (data.guest.password) {
      hashedPassword = await bcrypt.hash(data.guest.password, 10);
    }

    if (!guest) {
      guest = await this.repository.createGuest({
        uuid: uuidv4(),
        wedding_group_id: wedding.id,
        access_token: guestAccessToken,
        name: data.guest.name,
        email: data.guest.email.toLowerCase(),
        phone: data.guest.phone,
        relationship: data.guest.relationship,
        side: data.guest.side,
        status: 'booked',
        import_source: 'api',
        // Add password if provided
        ...(hashedPassword ? { password: hashedPassword, password_set_at: new Date() } : {}),
      });
    } else {
      // Update existing guest
      const updateData: any = {
        name: data.guest.name,
        phone: data.guest.phone || guest.phone,
        relationship: data.guest.relationship || guest.relationship,
        side: data.guest.side || guest.side,
        status: 'booked',
        access_token: guestAccessToken, // Refresh token
      };

      // Only set password if guest doesn't have one already and new password is provided
      if (hashedPassword && !guest.password) {
        updateData.password = hashedPassword;
        updateData.password_set_at = new Date();
      }

      await this.repository.updateGuest(guest.id, updateData);
      // Refresh guest data
      guest = await this.repository.findGuestByEmailAndWedding(
        data.guest.email.toLowerCase(),
        wedding.id,
      );
    }

    // Generate booking reference
    const bookingReference = await this.generateBookingReference();

    // Create booking record
    const booking = await this.repository.createBooking({
      uuid: uuidv4(),
      booking_reference: bookingReference,
      wedding_group_id: wedding.id,
      guest_id: guest!.id,
      check_in_date: data.check_in,
      check_out_date: data.check_out,
      total_rooms: totalRooms,
      total_nights: nights,
      total_adults: data.total_adults,
      total_children: data.total_children || 0,
      subtotal: subtotal,  // Pre-tax amount
      tax_rate: taxRate,   // Tax rate at time of booking
      tax_amount: taxAmount,  // Calculated tax
      total_amount: totalWithTax,  // Total INCLUDING taxes
      deposit_amount: depositInfo.amount,
      final_amount: totalWithTax - depositInfo.amount,
      currency: wedding.currency_code || 'USD', // Inherit currency from wedding group
      status: data.payment_intent_id ? 'deposit_paid' : 'pending',
      special_requests: data.special_requests,
      deposit_paid_at: data.payment_intent_id ? new Date() : undefined,
      guest_timezone: data.guest_timezone || null, // Capture guest's timezone
      roommate_opt_in: data.roommate_opt_in || false, // Solo traveler connection opt-in
      roommate_note: data.roommate_note || null, // Optional roommate preference note
    });

    // Create booking rooms with variable pricing data
    for (const roomDetail of roomDetails) {
      await this.repository.createBookingRoom({
        uuid: uuidv4(),
        booking_id: booking.id,
        room_block_id: roomDetail.block.id,
        room_type_id: roomDetail.block.room_type_id,
        quantity: roomDetail.quantity,
        adults: roomDetail.adults,
        children: roomDetail.children,
        teens: roomDetail.teens, // New field for teens
        price_per_night: roomDetail.pricePerNight,
        total_nights: nights,
        subtotal: roomDetail.total,
        extra_person_charges: roomDetail.extraPersonCharges, // New field for extra charges
        price_breakdown: roomDetail.priceBreakdown, // New field for nightly breakdown
      });
    }

    // Create booking addons
    for (const addonDetail of addonDetails) {
      await this.repository.createBookingAddon({
        uuid: uuidv4(),
        booking_id: booking.id,
        group_addon_id: addonDetail.addon.id,
        addon_type: addonDetail.addon.addon_type,
        quantity: addonDetail.quantity,
        price: addonDetail.price,
        pricing_type: addonDetail.addon.pricing_type,
        applies_to: addonDetail.appliesTo,
        subtotal: addonDetail.total,
      });
    }

    // BW-027/BW-028: Convert inventory holds to this booking
    if (data.guest_session_id && this.inventoryHoldService) {
      try {
        const convertedCount = await this.inventoryHoldService.convertHoldsToBooking(
          data.guest_session_id,
          booking.id,
        );
        if (convertedCount > 0) {
          this.logger.log(`Converted ${convertedCount} hold(s) to booking ${bookingReference}`);
        }
      } catch (error) {
        // Don't fail the booking if hold conversion fails - rooms are already booked
        this.logger.warn(`Failed to convert holds for booking ${bookingReference}: ${error.message}`);
      }
    }

    // Link payment to booking if payment_intent_id is provided
    if (data.payment_intent_id) {
      try {
        const payment = await this.paymentsRepository.findOne({
          where: { payment_intent_id: data.payment_intent_id },
        });

        if (payment) {
          payment.booking_id = booking.id;
          await payment.save();
          this.logger.log(`Linked payment ${payment.uuid} to booking ${bookingReference}`);
        } else {
          this.logger.warn(`Payment not found for payment_intent_id: ${data.payment_intent_id}`);
        }
      } catch (error) {
        this.logger.error(`Error linking payment to booking: ${error.message}`);
      }
    }

    // Emit booking.created event for N8N webhooks (async - don't block response)
    this.eventsService.emit(EventType.BOOKING_CREATED, {
      booking_reference: bookingReference,
      booking_uuid: booking.uuid,
      guest: {
        name: guest!.name,
        email: guest!.email,
        phone: guest!.phone,
      },
      wedding: {
        name: wedding.name,
        slug: wedding.booking_link,
        event_date: wedding.event_start_date,
      },
      check_in: data.check_in,
      check_out: data.check_out,
      nights,
      total_rooms: totalRooms,
      rooms: roomDetails.map((rd) => ({
        room_type: rd.block.room_type?.name || 'Room',
        quantity: rd.quantity,
        price_per_night: rd.pricePerNight,
        total: rd.total,
      })),
      addons: addonDetails.map((ad) => ({
        name: ad.addon.name,
        quantity: ad.quantity,
        total: ad.total,
      })),
      amounts: {
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total: totalWithTax,
        deposit: depositInfo.amount,
        balance_due: totalWithTax - depositInfo.amount,
        currency: wedding.currency_code || 'USD',
      },
      status: booking.status,
      created_at: new Date().toISOString(),
    }).catch((error) => {
      this.logger.error(`Failed to emit booking.created event: ${error.message}`);
    });

    // Send booking confirmation email (async - don't block response)
    this.sendBookingConfirmationEmail({
      wedding,
      guest: guest!,
      guestAccessToken,
      booking,
      bookingReference,
      roomDetails,
      addonDetails,
      data,
      nights,
      totalRooms,
      subtotal,
      taxRate,
      taxAmount,
      totalWithTax,
      depositInfo,
    }).catch((error) => {
      this.logger.error(`Failed to send booking confirmation email: ${error.message}`);
    });

    return {
      success: true,
      booking_uuid: booking.uuid,
      booking_reference: bookingReference,
      guest_uuid: guest!.uuid,
      guest_access_token: guestAccessToken,
      status: booking.status,
      check_in: data.check_in,
      check_out: data.check_out,
      nights,
      total_rooms: totalRooms,
      subtotal: subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalWithTax,
      deposit_amount: depositInfo.amount,
      balance_amount: totalWithTax - depositInfo.amount,
      currency: wedding.currency_code || 'USD', // Inherit currency from wedding group
      payment_schedule: {
        deposit_due_now: depositInfo.amount,
        balance_due_by: this.calculateBalanceDueDate(
          wedding.event_start_date,
          wedding.final_payment_due_days,
        ),
        balance_amount: totalWithTax - depositInfo.amount,
      },
    };
  }

  /**
   * Send booking confirmation email
   * Called asynchronously after booking creation
   */
  private async sendBookingConfirmationEmail(params: {
    wedding: WeddingGroupBasicEntity;
    guest: any;
    guestAccessToken: string;
    booking: any;
    bookingReference: string;
    roomDetails: Array<{ block: RoomBlockEntity; quantity: number; pricePerNight: number; total: number }>;
    addonDetails: Array<{ addon: any; quantity: number; price: number; total: number }>;
    data: CreatePublicBookingDto;
    nights: number;
    totalRooms: number;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    totalWithTax: number;
    depositInfo: { type: string; value: number; amount: number };
  }): Promise<void> {
    const {
      wedding,
      guest,
      guestAccessToken,
      booking,
      bookingReference,
      roomDetails,
      addonDetails,
      data,
      nights,
      totalRooms,
      subtotal,
      taxRate,
      taxAmount,
      totalWithTax,
      depositInfo,
    } = params;

    try {
      // Fetch hotel info for the wedding
      const weddingWithHotel = await WeddingGroups.findOne({
        where: { id: wedding.id },
        include: [{ model: Hotels, as: 'hotel' }],
      });

      const hotel = (weddingWithHotel as any)?.hotel;

      // Check if guest has password set, generate token if not
      const hasPassword = !!guest.password;
      let setPasswordToken: string | null = null;

      if (!hasPassword) {
        // Generate a secure token for setting password
        setPasswordToken = generateRandomString(64);
        const tokenExpires = new Date();
        tokenExpires.setDate(tokenExpires.getDate() + 7); // Token valid for 7 days

        // Save token to guest
        await Guests.update(
          {
            set_password_token: setPasswordToken,
            set_password_token_expires: tokenExpires,
          },
          { where: { id: guest.id } },
        );
      }

      // Build email data
      const emailData: BookingConfirmationData = {
        // Guest Info
        guestName: guest.name,
        guestEmail: guest.email,
        guestAccessToken,
        guestId: guest.id,
        hasPassword,
        setPasswordToken,

        // Booking Info
        bookingReference,
        bookingUuid: booking.uuid,
        checkInDate: data.check_in,
        checkOutDate: data.check_out,
        totalNights: nights,
        totalRooms,
        totalAdults: data.total_adults || 2,
        totalChildren: data.total_children || 0,
        specialRequests: data.special_requests,

        // Wedding/Event Info
        weddingName: wedding.name,
        brideName: wedding.bride_name,
        groomName: wedding.groom_name,
        eventStartDate: wedding.event_start_date,
        eventEndDate: wedding.event_end_date,

        // Contact Info (shown to confirmed guests) - use weddingWithHotel for fresh data
        brideEmail: (weddingWithHotel as any)?.bride_email,
        bridePhone: (weddingWithHotel as any)?.bride_phone,
        groomEmail: (weddingWithHotel as any)?.groom_email,
        groomPhone: (weddingWithHotel as any)?.groom_phone,
        hotelContactName: (weddingWithHotel as any)?.hotel_contact_name,
        hotelContactEmail: (weddingWithHotel as any)?.hotel_contact_email,
        hotelContactPhone: (weddingWithHotel as any)?.hotel_contact_phone,

        // Hotel Info
        hotelName: hotel?.name || 'Hotel',
        hotelCity: hotel?.city || '',
        hotelCountry: hotel?.country || '',
        hotelAddress: hotel?.address,
        hotelPhone: hotel?.phone,
        hotelWebsite: hotel?.website_url,

        // Room Details
        rooms: roomDetails.map((rd) => ({
          roomTypeName: rd.block.room_type?.name || 'Room',
          quantity: rd.quantity,
          pricePerNight: rd.pricePerNight,
          totalPrice: rd.total,
        })),

        // Add-on Details
        addons: addonDetails.map((ad) => ({
          addonName: ad.addon.name,
          quantity: ad.quantity,
          totalPrice: ad.total,
        })),

        // Pricing
        subtotal: subtotal,
        taxRate: taxRate,
        taxAmount: taxAmount,
        totalAmount: totalWithTax,
        depositAmount: depositInfo.amount,
        balanceAmount: totalWithTax - depositInfo.amount,
        currency: wedding.currency_code || 'USD', // Inherit currency from wedding group

        // Payment Schedule
        depositDueNow: depositInfo.amount,
        balanceDueDate: this.calculateBalanceDueDate(
          wedding.event_start_date,
          wedding.final_payment_due_days,
        ),

        // Status
        status: booking.status,
        depositPaid: !!data.payment_intent_id,
      };

      // Send email
      const result = await this.bookingConfirmationEmailService.sendConfirmationEmail(emailData);

      if (result.success) {
        this.logger.log(`Booking confirmation email sent for ${bookingReference}`);
      } else {
        this.logger.warn(`Failed to send confirmation email for ${bookingReference}: ${result.message}`);
      }
    } catch (error) {
      this.logger.error(`Error sending booking confirmation email: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get booking details by UUID
   * Returns full booking information including rooms, addons, payments, and invoices.
   */
  async getBookingDetails(bookingUuid: string): Promise<any | null> {
    const booking = await Bookings.findOne({
      where: { uuid: bookingUuid },
      include: [
        {
          model: Guests,
          as: 'guest',
        },
        {
          model: WeddingGroups,
          as: 'wedding_group',
          include: [
            {
              model: Hotels,
              as: 'hotel',
            },
            {
              model: GroupItinerary,
              as: 'itinerary',
            },
          ],
        },
        {
          model: BookingRooms,
          as: 'booking_rooms',
          include: [
            {
              model: RoomTypes,
              as: 'room_type',
            },
          ],
        },
        {
          model: BookingAddons,
          as: 'booking_addons',
          include: [
            {
              model: GroupAddons,
              as: 'group_addon',
            },
          ],
        },
        {
          model: Payments,
          as: 'payments',
        },
        {
          model: Invoices,
          as: 'invoices',
        },
      ],
    });

    if (!booking) {
      return null;
    }

    return {
      uuid: booking.uuid,
      booking_reference: booking.booking_reference,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      total_rooms: booking.total_rooms,
      total_nights: booking.total_nights,
      total_adults: booking.total_adults,
      total_children: booking.total_children,
      total_amount: Number(booking.total_amount),
      deposit_amount: Number(booking.deposit_amount),
      final_amount: Number(booking.final_amount),
      currency: booking.currency,
      status: booking.status,
      special_requests: booking.special_requests,
      deposit_paid_at: booking.deposit_paid_at,
      final_paid_at: booking.final_paid_at,
      confirmed_at: booking.confirmed_at,
      guest: booking.guest
        ? {
            uuid: booking.guest.uuid,
            name: booking.guest.name,
            email: booking.guest.email,
            phone: booking.guest.phone,
          }
        : null,
      wedding_group: booking.wedding_group
        ? {
            uuid: booking.wedding_group.uuid,
            name: booking.wedding_group.name,
            bride_name: booking.wedding_group.bride_name,
            groom_name: booking.wedding_group.groom_name,
            event_start_date: booking.wedding_group.event_start_date,
            event_end_date: booking.wedding_group.event_end_date,
            hotel: booking.wedding_group.hotel
              ? {
                  name: booking.wedding_group.hotel.name,
                  city: booking.wedding_group.hotel.city,
                  country: booking.wedding_group.hotel.country,
                }
              : null,
            itinerary: ((booking.wedding_group as any).itinerary || [])
              .sort((a: any, b: any) => {
                // Sort by date first, then by time
                const dateCompare = new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
                if (dateCompare !== 0) return dateCompare;
                if (a.event_time && b.event_time) {
                  return a.event_time.localeCompare(b.event_time);
                }
                return 0;
              })
              .map((item: any) => ({
                uuid: item.uuid,
                title: item.title,
                description: item.description,
                event_date: item.event_date,
                event_time: item.event_time,
                location: item.location,
                icon_type: item.icon_type,
              })),
          }
        : null,
      booking_rooms: (booking.booking_rooms || []).map((room: any) => ({
        uuid: room.uuid,
        room_type_name: room.room_type?.name || 'Room',
        quantity: room.quantity,
        price_per_night: Number(room.price_per_night),
        total_price: Number(room.subtotal),
        adults: room.adults,
        children: room.children,
      })),
      booking_addons: (booking.booking_addons || []).map((addon: any) => ({
        uuid: addon.uuid,
        addon_name: addon.group_addon?.name || 'Addon',
        quantity: addon.quantity,
        unit_price: Number(addon.price),
        total_price: Number(addon.subtotal),
      })),
      payments: (booking.payments || []).map((payment: any) => ({
        uuid: payment.uuid,
        payment_type: payment.payment_type,
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        paid_at: payment.paid_at,
      })),
      invoices: (booking.invoices || []).map((invoice: any) => ({
        uuid: invoice.uuid,
        invoice_number: invoice.invoice_number,
        invoice_type: invoice.invoice_type,
        amount: Number(invoice.total_amount),
        currency: invoice.currency,
        status: invoice.status,
        issued_at: invoice.issued_at,
        pdf_url: invoice.pdf_url,
      })),
      roommate_opt_in: booking.roommate_opt_in || false,
      roommate_note: booking.roommate_note || null,
    };
  }
}
