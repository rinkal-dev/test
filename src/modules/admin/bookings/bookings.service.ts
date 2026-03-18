import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Op, Sequelize } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import {
  BOOKINGS_REPOSITORY,
  BOOKING_ROOMS_REPOSITORY,
  BOOKING_ADDONS_REPOSITORY,
  WEDDING_GROUPS_REPOSITORY,
  GUESTS_REPOSITORY,
  GROUP_ROOM_BLOCKS_REPOSITORY,
  GROUP_ADDONS_REPOSITORY,
  GUEST_FLIGHTS_REPOSITORY,
} from 'src/config/constants';
import { EventsService } from 'src/modules/events/events.service';
import { EventType } from 'src/modules/events/event-types';
import {
  Bookings,
  BookingRooms,
  BookingAddons,
  WeddingGroups,
  Guests,
  GroupRoomBlocks,
  GroupAddons,
  Hotels,
  RoomTypes,
} from 'src/models';
import { GuestFlights } from 'src/models/GuestFlights';
import { CreateBookingDto } from './dto/CreateBookingDto';
import { UpdateBookingDto } from './dto/UpdateBookingDto';
import { BookingQueryDto } from './dto/BookingQueryDto';
import { calculateVariableRoomPrice } from 'src/helpers/variable-pricing.helper';

@Injectable()
export class BookingsService {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private bookingsRepository: typeof Bookings,
    @Inject(BOOKING_ROOMS_REPOSITORY) private bookingRoomsRepository: typeof BookingRooms,
    @Inject(BOOKING_ADDONS_REPOSITORY) private bookingAddonsRepository: typeof BookingAddons,
    @Inject(WEDDING_GROUPS_REPOSITORY) private weddingGroupsRepository: typeof WeddingGroups,
    @Inject(GUESTS_REPOSITORY) private guestsRepository: typeof Guests,
    @Inject(GROUP_ROOM_BLOCKS_REPOSITORY) private groupRoomBlocksRepository: typeof GroupRoomBlocks,
    @Inject(GROUP_ADDONS_REPOSITORY) private groupAddonsRepository: typeof GroupAddons,
    @Inject(GUEST_FLIGHTS_REPOSITORY) private guestFlightsRepository: typeof GuestFlights,
    private eventsService: EventsService,
  ) {}

  // Generate unique booking reference: WED-2026-XXXXX
  private async generateBookingReference(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `WED-${year}-`;

    // Get the last booking reference for this year
    const lastBooking = await this.bookingsRepository.findOne({
      where: {
        booking_reference: {
          [Op.like]: `${prefix}%`,
        },
      },
      order: [['booking_reference', 'DESC']],
    });

    let nextNumber = 1;
    if (lastBooking) {
      const lastNumber = parseInt(lastBooking.booking_reference.split('-')[2], 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  }

  // Calculate number of nights between two dates
  private calculateNights(checkIn: string, checkOut: string): number {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Helper: Get guest count based on applies_to setting
   * Used for per_guest and per_guest_per_night pricing
   */
  private getGuestCountForAddon(
    appliesTo: 'all_guests' | 'adults_only' | 'children_only' | string | undefined,
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
   * Get all bookings with pagination and filters
   * @param queries - Query parameters for filtering
   * @param filterAdminId - Optional admin ID for data-level filtering (null = no filter)
   */
  async getAllBookings(queries: BookingQueryDto, filterAdminId?: number | null) {
    const page = Number(queries.page) || 1;
    const limit = Number(queries.limit) || 10;
    const offset = (page - 1) * limit;

    const where: any = {};
    const weddingGroupWhere: any = {};

    // Data-level filtering: Filter by wedding group owner
    if (filterAdminId !== null && filterAdminId !== undefined) {
      weddingGroupWhere.created_by = filterAdminId;
    }

    // Filter by wedding group
    if (queries.wedding_group_uuid) {
      const group = await this.weddingGroupsRepository.findOne({
        where: { uuid: queries.wedding_group_uuid },
      });
      if (group) {
        where.wedding_group_id = group.id;
      }
    }

    // Filter by status
    if (queries.status) {
      where.status = queries.status;
    }

    // Filter by date range
    if (queries.date_from || queries.date_to) {
      where.check_in_date = {};
      if (queries.date_from) {
        where.check_in_date[Op.gte] = queries.date_from;
      }
      if (queries.date_to) {
        where.check_in_date[Op.lte] = queries.date_to;
      }
    }

    // Search by booking reference or wedding group name
    if (queries.search) {
      where[Op.or] = [
        { booking_reference: { [Op.iLike]: `%${queries.search}%` } },
        { '$wedding_group.name$': { [Op.iLike]: `%${queries.search}%` } },
      ];
    }

    const sortBy = queries.sort_by || 'created_at';
    const sortOrder = queries.sort_order || 'DESC';

    return await this.bookingsRepository.findAndCountAll({
      where,
      include: [
        {
          model: Guests,
          as: 'guest',
          attributes: ['uuid', 'name', 'email', 'phone'],
        },
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: ['uuid', 'name', 'bride_name', 'groom_name', 'event_start_date', 'created_by'],
          where: Object.keys(weddingGroupWhere).length > 0 ? weddingGroupWhere : undefined,
          include: [
            {
              model: Hotels,
              as: 'hotel',
              attributes: ['uuid', 'name'],
            },
          ],
        },
      ],
      order: [[sortBy, sortOrder]],
      offset,
      limit,
    });
  }

  // Get booking by UUID with full details
  async getBookingByUuid(uuid: string) {
    const booking = await this.bookingsRepository.findOne({
      where: { uuid },
      include: [
        {
          model: Guests,
          as: 'guest',
          attributes: ['uuid', 'name', 'email', 'phone'],
        },
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: ['uuid', 'name', 'bride_name', 'groom_name', 'event_start_date', 'event_end_date', 'created_by'],
          include: [
            {
              model: Hotels,
              as: 'hotel',
              attributes: ['uuid', 'name', 'address', 'city', 'country'],
            },
          ],
        },
        {
          model: BookingRooms,
          as: 'booking_rooms',
          include: [
            {
              model: GroupRoomBlocks,
              as: 'room_block',
              include: [
                {
                  model: RoomTypes,
                  as: 'room_type',
                  attributes: ['uuid', 'name', 'description', 'max_adults', 'max_children', 'max_occupancy'],
                },
              ],
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
              attributes: ['uuid', 'name', 'description'],
            },
          ],
        },
      ],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  // Get booking by reference number
  async getBookingByReference(reference: string) {
    const booking = await this.bookingsRepository.findOne({
      where: { booking_reference: reference },
      include: [
        {
          model: Guests,
          as: 'guest',
          attributes: ['uuid', 'name', 'email', 'phone'],
        },
        {
          model: WeddingGroups,
          as: 'wedding_group',
          attributes: ['uuid', 'name', 'bride_name', 'groom_name', 'event_start_date', 'created_by'],
          include: [
            {
              model: Hotels,
              as: 'hotel',
              attributes: ['uuid', 'name', 'address'],
            },
          ],
        },
        {
          model: BookingRooms,
          as: 'booking_rooms',
          include: [
            {
              model: GroupRoomBlocks,
              as: 'room_block',
              include: [
                {
                  model: RoomTypes,
                  as: 'room_type',
                  attributes: ['uuid', 'name'],
                },
              ],
            },
          ],
        },
        {
          model: BookingAddons,
          as: 'booking_addons',
        },
      ],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  // Create new booking
  async createBooking(createDto: CreateBookingDto) {
    // Get wedding group
    const weddingGroup = await this.weddingGroupsRepository.findOne({
      where: { uuid: createDto.wedding_group_uuid },
    });
    if (!weddingGroup) {
      throw new NotFoundException('Wedding group not found');
    }

    // Get guest
    const guest = await this.guestsRepository.findOne({
      where: { uuid: createDto.guest_uuid },
    });
    if (!guest) {
      throw new NotFoundException('Guest not found');
    }

    // Validate dates
    const checkIn = new Date(createDto.check_in_date);
    const checkOut = new Date(createDto.check_out_date);
    if (checkOut <= checkIn) {
      throw new BadRequestException('Check-out date must be after check-in date');
    }

    // Calculate nights
    const totalNights = this.calculateNights(createDto.check_in_date, createDto.check_out_date);

    // Validate and calculate room costs
    let totalRooms = 0;
    let totalAdults = 0;
    let totalChildren = 0;
    let roomsTotalAmount = 0;
    const roomBlocksToBook: Array<{ block: GroupRoomBlocks; quantity: number; pricePerNight: number; adults: number; children: number }> = [];

    for (const roomDto of createDto.rooms) {
      const roomBlock = await this.groupRoomBlocksRepository.findOne({
        where: { uuid: roomDto.room_block_uuid, wedding_group_id: weddingGroup.id },
        include: [{ model: RoomTypes, as: 'room_type' }],
      });

      if (!roomBlock) {
        throw new NotFoundException(`Room block ${roomDto.room_block_uuid} not found`);
      }

      // Check availability
      const availableRooms = roomBlock.rooms_allocated - roomBlock.rooms_booked;
      if (roomDto.quantity > availableRooms) {
        throw new ConflictException(`Only ${availableRooms} rooms available for ${roomBlock.room_type?.name}`);
      }

      const pricePerNight = Number(roomBlock.price_per_night);
      const roomCost = pricePerNight * roomDto.quantity * totalNights;

      totalRooms += roomDto.quantity;
      totalAdults += (roomDto.adults_per_room || 2) * roomDto.quantity;
      totalChildren += (roomDto.children_per_room || 0) * roomDto.quantity;
      roomsTotalAmount += roomCost;

      roomBlocksToBook.push({
        block: roomBlock,
        quantity: roomDto.quantity,
        pricePerNight,
        adults: roomDto.adults_per_room || 2,
        children: roomDto.children_per_room || 0,
      });
    }

    // Validate and calculate addon costs
    let addonsTotalAmount = 0;
    const addonsToBook: Array<{ addon: GroupAddons; quantity: number; unitPrice: number; subtotal: number }> = [];

    if (createDto.addons && createDto.addons.length > 0) {
      for (const addonDto of createDto.addons) {
        const addon = await this.groupAddonsRepository.findOne({
          where: { uuid: addonDto.addon_uuid, wedding_group_id: weddingGroup.id },
        });

        if (!addon) {
          throw new NotFoundException(`Addon ${addonDto.addon_uuid} not found`);
        }

        const unitPrice = Number(addon.price);
        // Get guest count based on applies_to setting
        const guestCount = this.getGuestCountForAddon(addon.applies_to, totalAdults || 2, totalChildren || 0);
        let addonCost = unitPrice * addonDto.quantity;

        // Calculate based on pricing_type
        switch (addon.pricing_type) {
          case 'per_night':
            addonCost *= totalNights;
            break;
          case 'per_guest':
            addonCost *= guestCount;
            break;
          case 'per_guest_per_night':
            addonCost *= guestCount * totalNights;
            break;
          case 'per_stay':
          default:
            // Flat fee, no multiplier needed
            break;
        }

        addonsTotalAmount += addonCost;

        addonsToBook.push({
          addon,
          quantity: addonDto.quantity,
          unitPrice,
          subtotal: addonCost,
        });
      }
    }

    // Calculate total amount
    const totalAmount = roomsTotalAmount + addonsTotalAmount;

    // Calculate deposit based on wedding group settings
    let depositAmount: number;
    if (weddingGroup.deposit_type === 'fixed') {
      depositAmount = Number(weddingGroup.deposit_value);
    } else if (weddingGroup.deposit_type === 'per_person') {
      // Per-person deposit: amount × total number of guests (adults + children)
      const totalGuests = totalAdults + totalChildren;
      depositAmount = Number(weddingGroup.deposit_value) * totalGuests;
    } else {
      // Percentage
      depositAmount = (totalAmount * Number(weddingGroup.deposit_value)) / 100;
    }

    const finalAmount = totalAmount - depositAmount;

    // Generate booking reference
    const bookingReference = await this.generateBookingReference();

    // Create booking
    const booking = await this.bookingsRepository.create({
      uuid: uuidv4(),
      booking_reference: bookingReference,
      wedding_group_id: weddingGroup.id,
      guest_id: guest.id,
      check_in_date: createDto.check_in_date,
      check_out_date: createDto.check_out_date,
      total_rooms: totalRooms,
      total_nights: totalNights,
      total_adults: totalAdults,
      total_children: totalChildren,
      total_amount: totalAmount,
      deposit_amount: depositAmount,
      final_amount: finalAmount,
      currency: createDto.currency || 'USD',
      status: createDto.status || 'pending',
      special_requests: createDto.special_requests,
    });

    // Create booking rooms and update room block inventory
    for (const roomData of roomBlocksToBook) {
      await this.bookingRoomsRepository.create({
        uuid: uuidv4(),
        booking_id: booking.id,
        room_block_id: roomData.block.id,
        quantity: roomData.quantity,
        price_per_night: roomData.pricePerNight,
        total_nights: totalNights,
        subtotal: roomData.pricePerNight * roomData.quantity * totalNights,
        adults: roomData.adults,
        children: roomData.children,
      });

      // Update room block inventory
      await this.groupRoomBlocksRepository.update(
        { rooms_booked: roomData.block.rooms_booked + roomData.quantity },
        { where: { id: roomData.block.id } },
      );
    }

    // Create booking addons
    for (const addonData of addonsToBook) {
      await this.bookingAddonsRepository.create({
        uuid: uuidv4(),
        booking_id: booking.id,
        group_addon_id: addonData.addon.id,
        addon_type: addonData.addon.addon_type || 'other',
        quantity: addonData.quantity,
        price: addonData.unitPrice,
        pricing_type: addonData.addon.pricing_type || 'per_stay',
        applies_to: addonData.addon.applies_to || 'all_guests',
        subtotal: addonData.subtotal,
      });
    }

    // Get full booking details for event
    const fullBooking = await this.getBookingByUuid(booking.uuid);

    // Emit booking.created event
    this.eventsService.emit(EventType.BOOKING_CREATED, {
      booking_uuid: booking.uuid,
      booking_reference: bookingReference,
      guest: {
        uuid: guest.uuid,
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
      },
      wedding_group: {
        uuid: weddingGroup.uuid,
        name: weddingGroup.name,
      },
      check_in_date: createDto.check_in_date,
      check_out_date: createDto.check_out_date,
      total_rooms: totalRooms,
      total_nights: totalNights,
      amounts: {
        total: totalAmount,
        deposit: depositAmount,
        final: finalAmount,
        currency: createDto.currency || 'USD',
      },
      status: createDto.status || 'pending',
    });

    return fullBooking;
  }

  // Update booking
  async updateBooking(uuid: string, updateDto: UpdateBookingDto) {
    const booking = await this.bookingsRepository.findOne({
      where: { uuid },
      include: [
        { model: BookingRooms, as: 'booking_rooms' },
        { model: BookingAddons, as: 'booking_addons' },
      ],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const updateData: any = { ...updateDto };

    // Check if dates or travelers changed - need to recalculate prices
    const datesChanged = (updateDto.check_in_date && updateDto.check_in_date !== booking.check_in_date) ||
                         (updateDto.check_out_date && updateDto.check_out_date !== booking.check_out_date);
    const travelersChanged = (updateDto.total_adults !== undefined && updateDto.total_adults !== booking.total_adults) ||
                             (updateDto.total_children !== undefined && updateDto.total_children !== booking.total_children);

    // Recalculate prices if dates or travelers changed
    if (datesChanged || travelersChanged) {
      // Don't allow price changes on cancelled/completed bookings
      if (['cancelled', 'completed'].includes(booking.status)) {
        throw new BadRequestException(`Cannot modify dates/travelers on a ${booking.status} booking`);
      }

      // Get wedding group for deposit calculation
      const weddingGroup = await this.weddingGroupsRepository.findByPk(booking.wedding_group_id);
      if (!weddingGroup) {
        throw new NotFoundException('Wedding group not found');
      }

      // Calculate new values
      const newCheckIn = updateDto.check_in_date || booking.check_in_date;
      const newCheckOut = updateDto.check_out_date || booking.check_out_date;
      const newNights = this.calculateNights(newCheckIn, newCheckOut);
      const newAdults = updateDto.total_adults ?? booking.total_adults ?? 1;
      const newChildren = updateDto.total_children ?? booking.total_children ?? 0;

      updateData.total_nights = newNights;

      // Recalculate room subtotals if dates or travelers changed
      let roomsTotalAmount = 0;
      if ((datesChanged || travelersChanged) && booking.booking_rooms?.length > 0) {
        for (const bookingRoom of booking.booking_rooms) {
          // Get the room block to check price_type and variable pricing
          const roomBlock = await this.groupRoomBlocksRepository.findOne({
            where: { id: bookingRoom.room_block_id },
            include: [{ model: RoomTypes, as: 'room_type' }],
          });

          let newSubtotal: number;

          if (roomBlock && roomBlock.price_type === 'per_person') {
            // PER-PERSON PRICING: Always charge for room capacity (rooms × base_occupancy)
            const baseOccupancy = roomBlock.base_occupancy || 2;
            const roomCapacity = bookingRoom.quantity * baseOccupancy;
            const actualGuests = newAdults + newChildren;

            // Calculate billable guests: always room capacity
            // Phantom guests (empty beds) are charged at adult rate
            let billableAdults = newAdults;
            const billableChildren = newChildren;

            if (roomCapacity > actualGuests) {
              const phantomGuests = roomCapacity - actualGuests;
              billableAdults = newAdults + phantomGuests;
            }

            // Build pricing object for variable pricing calculation
            const blockPricing = {
              price_per_night: Number(roomBlock.price_per_night),
              price_type: roomBlock.price_type as 'per_room' | 'per_person',
              rate_sun_wed: roomBlock.rate_sun_wed ? Number(roomBlock.rate_sun_wed) : null,
              rate_thu_sat: roomBlock.rate_thu_sat ? Number(roomBlock.rate_thu_sat) : null,
              base_occupancy: baseOccupancy,
              extra_adult_per_night: roomBlock.extra_adult_per_night ? Number(roomBlock.extra_adult_per_night) : null,
              extra_child_per_night: roomBlock.extra_child_per_night !== null ? Number(roomBlock.extra_child_per_night) : null,
              extra_teen_per_night: roomBlock.extra_teen_per_night !== null ? Number(roomBlock.extra_teen_per_night) : null,
            };

            const priceResult = calculateVariableRoomPrice(
              newCheckIn,
              newCheckOut,
              blockPricing,
              billableAdults,
              billableChildren,
              0, // teens
            );
            newSubtotal = priceResult.total;
          } else {
            // PER-ROOM PRICING: Use standard calculation
            if (roomBlock && (roomBlock.rate_sun_wed || roomBlock.rate_thu_sat)) {
              // Has variable pricing
              const blockPricing = {
                price_per_night: Number(roomBlock.price_per_night),
                price_type: 'per_room' as const,
                rate_sun_wed: roomBlock.rate_sun_wed ? Number(roomBlock.rate_sun_wed) : null,
                rate_thu_sat: roomBlock.rate_thu_sat ? Number(roomBlock.rate_thu_sat) : null,
                base_occupancy: roomBlock.base_occupancy || 2,
                extra_adult_per_night: null,
                extra_child_per_night: null,
                extra_teen_per_night: null,
              };
              const priceResult = calculateVariableRoomPrice(
                newCheckIn,
                newCheckOut,
                blockPricing,
                2, 0, 0,
              );
              newSubtotal = priceResult.total * bookingRoom.quantity;
            } else {
              // Simple flat rate
              newSubtotal = Number(bookingRoom.price_per_night) * bookingRoom.quantity * newNights;
            }
          }

          await this.bookingRoomsRepository.update(
            { subtotal: newSubtotal },
            { where: { id: bookingRoom.id } },
          );
          roomsTotalAmount += newSubtotal;
        }
      } else {
        // Use existing room totals
        roomsTotalAmount = booking.booking_rooms?.reduce((sum, r) => sum + Number(r.subtotal), 0) || 0;
      }

      // Recalculate addon subtotals if dates or travelers changed
      let addonsTotalAmount = 0;
      if (booking.booking_addons?.length > 0) {
        for (const bookingAddon of booking.booking_addons) {
          // Get guest count based on applies_to setting stored in booking_addon
          const guestCount = this.getGuestCountForAddon(bookingAddon.applies_to, newAdults, newChildren);
          let newSubtotal = Number(bookingAddon.price) * bookingAddon.quantity;

          // Calculate based on pricing_type
          switch (bookingAddon.pricing_type) {
            case 'per_night':
              newSubtotal *= newNights;
              break;
            case 'per_guest':
              newSubtotal *= guestCount;
              break;
            case 'per_guest_per_night':
              newSubtotal *= guestCount * newNights;
              break;
            case 'per_stay':
            default:
              // Flat fee, no multiplier needed
              break;
          }

          await this.bookingAddonsRepository.update(
            { subtotal: newSubtotal },
            { where: { id: bookingAddon.id } },
          );
          addonsTotalAmount += newSubtotal;
        }
      }

      // Calculate new totals with tax
      const subtotal = roomsTotalAmount + addonsTotalAmount;
      const taxRate = Number(weddingGroup.tax_rate) || 0;
      const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
      const totalAmount = subtotal + taxAmount;

      let depositAmount: number;
      if (weddingGroup.deposit_type === 'fixed') {
        depositAmount = Number(weddingGroup.deposit_value);
      } else if (weddingGroup.deposit_type === 'per_person') {
        // Per-person deposit: amount × total number of guests (adults + children)
        const totalGuests = newAdults + newChildren;
        depositAmount = Number(weddingGroup.deposit_value) * totalGuests;
      } else {
        // Percentage (based on subtotal, not total with tax)
        depositAmount = (subtotal * Number(weddingGroup.deposit_value)) / 100;
      }
      const finalAmount = totalAmount - depositAmount;

      // Update booking amounts
      updateData.subtotal = subtotal;
      updateData.tax_amount = taxAmount;
      updateData.total_amount = totalAmount;
      updateData.deposit_amount = depositAmount;
      updateData.final_amount = finalAmount;
    }

    // If cancelling, set cancelled_at
    if (updateDto.status === 'cancelled' && booking.status !== 'cancelled') {
      updateData.cancelled_at = new Date();

      // Release room inventory
      const bookingRooms = await this.bookingRoomsRepository.findAll({
        where: { booking_id: booking.id },
      });

      for (const bookingRoom of bookingRooms) {
        const roomBlock = await this.groupRoomBlocksRepository.findByPk(bookingRoom.room_block_id);
        if (roomBlock) {
          await this.groupRoomBlocksRepository.update(
            { rooms_booked: Math.max(0, roomBlock.rooms_booked - bookingRoom.quantity) },
            { where: { id: roomBlock.id } },
          );
        }
      }

      // Cancel associated flight transfer statuses
      await this.cancelFlightTransfers(booking.id);

      // Update guest status back to 'invited' if they have no other active bookings
      if (booking.guest_id) {
        const otherActiveBookings = await this.bookingsRepository.count({
          where: {
            guest_id: booking.guest_id,
            id: { [Op.ne]: booking.id },
            status: { [Op.notIn]: ['cancelled'] },
          },
        });

        if (otherActiveBookings === 0) {
          await this.guestsRepository.update(
            { status: 'invited' },
            { where: { id: booking.guest_id } },
          );
        }
      }
    }

    // If confirming, set confirmed_at
    if (updateDto.status === 'confirmed' && booking.status !== 'confirmed') {
      updateData.confirmed_at = new Date();
    }

    const previousStatus = booking.status;
    await this.bookingsRepository.update(updateData, { where: { uuid } });

    const updatedBooking = await this.getBookingByUuid(uuid);

    // Emit events based on status change
    if (updateDto.status && updateDto.status !== previousStatus) {
      // Emit status changed event
      this.eventsService.emit(EventType.BOOKING_STATUS_CHANGED, {
        booking_uuid: uuid,
        booking_reference: booking.booking_reference,
        previous_status: previousStatus,
        new_status: updateDto.status,
      });

      // Emit specific events for confirmed/cancelled
      if (updateDto.status === 'confirmed') {
        this.eventsService.emit(EventType.BOOKING_CONFIRMED, {
          booking_uuid: uuid,
          booking_reference: booking.booking_reference,
          confirmed_at: updateData.confirmed_at,
        });
      } else if (updateDto.status === 'cancelled') {
        this.eventsService.emit(EventType.BOOKING_CANCELLED, {
          booking_uuid: uuid,
          booking_reference: booking.booking_reference,
          cancellation_reason: updateDto.cancellation_reason,
          cancelled_at: updateData.cancelled_at,
        });
      }
    } else if (Object.keys(updateDto).length > 0) {
      // Emit general update event if any fields changed
      this.eventsService.emit(EventType.BOOKING_UPDATED, {
        booking_uuid: uuid,
        booking_reference: booking.booking_reference,
        updated_fields: Object.keys(updateDto),
      });
    }

    return updatedBooking;
  }

  // Delete booking (soft delete by setting status to cancelled)
  async deleteBooking(uuid: string) {
    const booking = await this.bookingsRepository.findOne({ where: { uuid } });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Don't allow deleting completed or already cancelled bookings
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      throw new ConflictException(`Cannot delete a ${booking.status} booking`);
    }

    // Release room inventory
    const bookingRooms = await this.bookingRoomsRepository.findAll({
      where: { booking_id: booking.id },
    });

    for (const bookingRoom of bookingRooms) {
      const roomBlock = await this.groupRoomBlocksRepository.findByPk(bookingRoom.room_block_id);
      if (roomBlock) {
        await this.groupRoomBlocksRepository.update(
          { rooms_booked: Math.max(0, roomBlock.rooms_booked - bookingRoom.quantity) },
          { where: { id: roomBlock.id } },
        );
      }
    }

    // Cancel associated flight transfer statuses
    await this.cancelFlightTransfers(booking.id);

    // Update status to cancelled
    await this.bookingsRepository.update(
      {
        status: 'cancelled',
        cancelled_at: new Date(),
        cancellation_reason: 'Deleted by admin',
      },
      { where: { uuid } },
    );

    // Update guest status back to 'invited' if they have no other active bookings
    if (booking.guest_id) {
      const otherActiveBookings = await this.bookingsRepository.count({
        where: {
          guest_id: booking.guest_id,
          id: { [Op.ne]: booking.id },
          status: { [Op.notIn]: ['cancelled'] },
        },
      });

      if (otherActiveBookings === 0) {
        await this.guestsRepository.update(
          { status: 'invited' },
          { where: { id: booking.guest_id } },
        );
      }
    }

    return { message: 'Booking deleted successfully' };
  }

  // Get booking statistics for a wedding group
  /**
   * Get booking statistics for a wedding group
   * @param weddingGroupUuid - The wedding group UUID
   * @param filterAdminId - Optional admin ID for data-level filtering (null = no filter)
   */
  async getBookingStats(weddingGroupUuid: string, filterAdminId?: number | null) {
    const whereClause: any = { uuid: weddingGroupUuid };

    // Data-level filtering: Filter by wedding group owner
    if (filterAdminId !== null && filterAdminId !== undefined) {
      whereClause.created_by = filterAdminId;
    }

    const weddingGroup = await this.weddingGroupsRepository.findOne({
      where: whereClause,
    });

    if (!weddingGroup) {
      throw new NotFoundException('Wedding group not found or you do not have access');
    }

    const bookings = await this.bookingsRepository.findAll({
      where: { wedding_group_id: weddingGroup.id },
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'total_bookings'],
        [Sequelize.fn('SUM', Sequelize.col('total_amount')), 'total_revenue'],
        [Sequelize.fn('SUM', Sequelize.col('total_rooms')), 'total_rooms_booked'],
        'status',
      ],
      group: ['status'],
    });

    return {
      wedding_group_uuid: weddingGroupUuid,
      stats: bookings,
    };
  }

  // Calculate price breakdown for booking preview
  async calculatePriceBreakdown(
    weddingGroupUuid: string,
    checkInDate: string,
    checkOutDate: string,
    rooms: Array<{ room_block_uuid: string; quantity: number }>,
    addons?: Array<{ addon_uuid: string; quantity: number }>,
  ) {
    const weddingGroup = await this.weddingGroupsRepository.findOne({
      where: { uuid: weddingGroupUuid },
    });

    if (!weddingGroup) {
      throw new NotFoundException('Wedding group not found');
    }

    const totalNights = this.calculateNights(checkInDate, checkOutDate);

    // Calculate room costs
    const roomBreakdown = [];
    let roomsTotal = 0;

    for (const room of rooms) {
      const roomBlock = await this.groupRoomBlocksRepository.findOne({
        where: { uuid: room.room_block_uuid },
        include: [{ model: RoomTypes, as: 'room_type', attributes: ['name'] }],
      });

      if (roomBlock) {
        const pricePerNight = Number(roomBlock.price_per_night);
        const subtotal = pricePerNight * room.quantity * totalNights;
        roomsTotal += subtotal;

        roomBreakdown.push({
          room_type: roomBlock.room_type?.name,
          quantity: room.quantity,
          price_per_night: pricePerNight,
          nights: totalNights,
          subtotal,
        });
      }
    }

    // Calculate addon costs
    const addonBreakdown = [];
    let addonsTotal = 0;
    // Estimate guests from rooms (default 2 adults per room, 0 children for estimation)
    const totalRooms = rooms.reduce((sum, r) => sum + r.quantity, 0);
    const estimatedAdults = totalRooms * 2 || 2;
    const estimatedChildren = 0;

    if (addons && addons.length > 0) {
      for (const addon of addons) {
        const groupAddon = await this.groupAddonsRepository.findOne({
          where: { uuid: addon.addon_uuid },
        });

        if (groupAddon) {
          const unitPrice = Number(groupAddon.price);
          // Get guest count based on applies_to setting
          const guestCount = this.getGuestCountForAddon(groupAddon.applies_to, estimatedAdults, estimatedChildren);
          let subtotal = unitPrice * addon.quantity;

          // Calculate based on pricing_type
          switch (groupAddon.pricing_type) {
            case 'per_night':
              subtotal *= totalNights;
              break;
            case 'per_guest':
              subtotal *= guestCount;
              break;
            case 'per_guest_per_night':
              subtotal *= guestCount * totalNights;
              break;
            case 'per_stay':
            default:
              // Flat fee, no multiplier needed
              break;
          }

          addonsTotal += subtotal;

          addonBreakdown.push({
            name: groupAddon.name,
            quantity: addon.quantity,
            unit_price: unitPrice,
            pricing_type: groupAddon.pricing_type,
            applies_to: groupAddon.applies_to || 'all_guests',
            subtotal,
          });
        }
      }
    }

    const totalAmount = roomsTotal + addonsTotal;

    // Calculate deposit
    let depositAmount: number;
    if (weddingGroup.deposit_type === 'fixed') {
      depositAmount = Number(weddingGroup.deposit_value);
    } else if (weddingGroup.deposit_type === 'per_person') {
      // Per-person deposit: amount × total number of guests (adults + children)
      const totalGuests = estimatedAdults + estimatedChildren;
      depositAmount = Number(weddingGroup.deposit_value) * totalGuests;
    } else {
      // Percentage
      depositAmount = (totalAmount * Number(weddingGroup.deposit_value)) / 100;
    }

    const finalAmount = totalAmount - depositAmount;

    return {
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      total_nights: totalNights,
      rooms: roomBreakdown,
      rooms_total: roomsTotal,
      addons: addonBreakdown,
      addons_total: addonsTotal,
      total_amount: totalAmount,
      deposit_type: weddingGroup.deposit_type,
      deposit_value: Number(weddingGroup.deposit_value),
      deposit_amount: depositAmount,
      final_amount: finalAmount,
    };
  }

  // ==================== INTERNAL NOTES ====================

  // Add internal note to booking
  async addInternalNote(
    uuid: string,
    authorId: number,
    authorName: string,
    text: string,
  ) {
    const booking = await this.bookingsRepository.findOne({ where: { uuid } });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const notes = booking.internal_notes || [];
    const newNote = {
      id: uuidv4(),
      author: authorName,
      author_id: authorId,
      text,
      timestamp: new Date().toISOString(),
    };

    notes.push(newNote);

    await this.bookingsRepository.update(
      { internal_notes: notes },
      { where: { uuid } },
    );

    return this.getBookingByUuid(uuid);
  }

  // Delete internal note from booking
  async deleteInternalNote(uuid: string, noteId: string) {
    const booking = await this.bookingsRepository.findOne({ where: { uuid } });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const notes = booking.internal_notes || [];
    const filteredNotes = notes.filter((note) => note.id !== noteId);

    if (notes.length === filteredNotes.length) {
      throw new NotFoundException('Note not found');
    }

    await this.bookingsRepository.update(
      { internal_notes: filteredNotes },
      { where: { uuid } },
    );

    return this.getBookingByUuid(uuid);
  }

  // ==================== MODIFY ROOMS ====================

  // Update booking rooms and recalculate totals
  async updateBookingRooms(
    uuid: string,
    rooms: Array<{ room_block_uuid: string; quantity: number; adults_per_room?: number; children_per_room?: number }>,
  ) {
    const booking = await this.bookingsRepository.findOne({
      where: { uuid },
      include: [{ model: BookingRooms, as: 'booking_rooms' }],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Don't allow modifications on cancelled/completed bookings
    if (['cancelled', 'completed'].includes(booking.status)) {
      throw new BadRequestException(`Cannot modify rooms on a ${booking.status} booking`);
    }

    // Get wedding group for deposit calculation
    const weddingGroup = await this.weddingGroupsRepository.findByPk(booking.wedding_group_id);
    if (!weddingGroup) {
      throw new NotFoundException('Wedding group not found');
    }

    // Release current room inventory
    for (const bookingRoom of booking.booking_rooms) {
      const roomBlock = await this.groupRoomBlocksRepository.findByPk(bookingRoom.room_block_id);
      if (roomBlock) {
        await this.groupRoomBlocksRepository.update(
          { rooms_booked: Math.max(0, roomBlock.rooms_booked - bookingRoom.quantity) },
          { where: { id: roomBlock.id } },
        );
      }
    }

    // Delete current booking rooms
    await this.bookingRoomsRepository.destroy({ where: { booking_id: booking.id } });

    // Validate and create new room bookings
    let totalRooms = 0;
    let totalAdults = 0;
    let totalChildren = 0;
    let roomsTotalAmount = 0;
    const roomBlocksToBook: Array<{
      block: GroupRoomBlocks;
      quantity: number;
      pricePerNight: number;
      adults: number;
      children: number;
      subtotal: number;
      extraPersonCharges: number;
      priceBreakdown: any;
    }> = [];

    // Calculate total rooms first to distribute guests properly
    const totalNewRooms = rooms.reduce((sum, r) => sum + r.quantity, 0);

    // Get booking's current total guests (preserve these when editing rooms)
    const bookingTotalAdults = booking.total_adults || 2;
    const bookingTotalChildren = booking.total_children || 0;

    for (const roomDto of rooms) {
      const roomBlock = await this.groupRoomBlocksRepository.findOne({
        where: { uuid: roomDto.room_block_uuid, wedding_group_id: weddingGroup.id },
        include: [{ model: RoomTypes, as: 'room_type' }],
      });

      if (!roomBlock) {
        throw new NotFoundException(`Room block ${roomDto.room_block_uuid} not found`);
      }

      // Check availability
      const availableRooms = roomBlock.rooms_allocated - roomBlock.rooms_booked;
      if (roomDto.quantity > availableRooms) {
        throw new ConflictException(`Only ${availableRooms} rooms available for ${roomBlock.room_type?.name}`);
      }

      const priceType = roomBlock.price_type || 'per_room';
      const baseOccupancy = roomBlock.base_occupancy || 2;

      let roomCost: number;
      let breakdown: any;
      let adultsForRoom: number;
      let childrenForRoom: number;

      if (priceType === 'per_person') {
        // PER-PERSON PRICING: Calculate based on TOTAL guests across all rooms
        // Each room type gets a proportional share of guests
        // For simplicity, if there's only one room type, all guests go to that room type

        // Use provided values or booking's total guests
        const totalAdultsForCalc = roomDto.adults_per_room
          ? roomDto.adults_per_room * roomDto.quantity
          : bookingTotalAdults;
        const totalChildrenForCalc = roomDto.children_per_room
          ? roomDto.children_per_room * roomDto.quantity
          : bookingTotalChildren;

        // Room capacity = rooms × base_occupancy (minimum adults charged)
        const roomCapacity = roomDto.quantity * baseOccupancy;

        // Billable adults = max(actual adults, room capacity)
        const billableAdults = Math.max(totalAdultsForCalc, roomCapacity);

        // Calculate price for all guests in these rooms
        const result = calculateVariableRoomPrice(
          booking.check_in_date,
          booking.check_out_date,
          {
            price_per_night: Number(roomBlock.price_per_night),
            price_type: 'per_person',
            rate_sun_wed: roomBlock.rate_sun_wed ? Number(roomBlock.rate_sun_wed) : null,
            rate_thu_sat: roomBlock.rate_thu_sat ? Number(roomBlock.rate_thu_sat) : null,
            base_occupancy: baseOccupancy,
            extra_adult_per_night: roomBlock.extra_adult_per_night ? Number(roomBlock.extra_adult_per_night) : null,
            extra_child_per_night: roomBlock.extra_child_per_night ? Number(roomBlock.extra_child_per_night) : null,
          },
          billableAdults,
          totalChildrenForCalc,
        );

        roomCost = result.total;
        breakdown = result.breakdown;
        adultsForRoom = totalAdultsForCalc;
        childrenForRoom = totalChildrenForCalc;
      } else {
        // PER-ROOM PRICING: Calculate per room then multiply by quantity
        const adultsPerRoom = roomDto.adults_per_room || 2;
        const childrenPerRoom = roomDto.children_per_room || 0;

        const result = calculateVariableRoomPrice(
          booking.check_in_date,
          booking.check_out_date,
          {
            price_per_night: Number(roomBlock.price_per_night),
            price_type: 'per_room',
            rate_sun_wed: roomBlock.rate_sun_wed ? Number(roomBlock.rate_sun_wed) : null,
            rate_thu_sat: roomBlock.rate_thu_sat ? Number(roomBlock.rate_thu_sat) : null,
            base_occupancy: baseOccupancy,
            extra_adult_per_night: roomBlock.extra_adult_per_night ? Number(roomBlock.extra_adult_per_night) : null,
            extra_child_per_night: roomBlock.extra_child_per_night ? Number(roomBlock.extra_child_per_night) : null,
          },
          adultsPerRoom,
          childrenPerRoom,
        );

        roomCost = result.total * roomDto.quantity;
        breakdown = result.breakdown;
        adultsForRoom = adultsPerRoom * roomDto.quantity;
        childrenForRoom = childrenPerRoom * roomDto.quantity;
      }

      totalRooms += roomDto.quantity;
      totalAdults += adultsForRoom;
      totalChildren += childrenForRoom;
      roomsTotalAmount += roomCost;

      roomBlocksToBook.push({
        block: roomBlock,
        quantity: roomDto.quantity,
        pricePerNight: Number(roomBlock.price_per_night),
        adults: adultsForRoom,
        children: childrenForRoom,
        subtotal: roomCost,
        extraPersonCharges: breakdown.extra_person_total,
        priceBreakdown: breakdown,
      });
    }

    // Recalculate add-ons based on new guest count
    const existingAddons = await this.bookingAddonsRepository.findAll({
      where: { booking_id: booking.id },
      include: [{ model: GroupAddons, as: 'group_addon' }],
    });

    let addonsTotalAmount = 0;
    for (const addon of existingAddons) {
      // Get guest count based on applies_to setting
      const guestCount = this.getGuestCountForAddon(
        addon.applies_to,
        totalAdults,
        totalChildren,
      );

      let newSubtotal = Number(addon.price) * addon.quantity;
      switch (addon.pricing_type) {
        case 'per_night':
          newSubtotal *= booking.total_nights;
          break;
        case 'per_guest':
          newSubtotal *= guestCount;
          break;
        case 'per_guest_per_night':
          newSubtotal *= guestCount * booking.total_nights;
          break;
        case 'per_stay':
        default:
          break;
      }

      // Update addon subtotal in database
      await this.bookingAddonsRepository.update(
        { subtotal: newSubtotal },
        { where: { id: addon.id } },
      );

      addonsTotalAmount += newSubtotal;
    }

    // Calculate totals with tax
    const subtotal = roomsTotalAmount + addonsTotalAmount;
    const taxRate = Number(weddingGroup.tax_rate) || 0;
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const totalAmount = subtotal + taxAmount;

    let depositAmount: number;
    if (weddingGroup.deposit_type === 'fixed') {
      depositAmount = Number(weddingGroup.deposit_value);
    } else if (weddingGroup.deposit_type === 'per_person') {
      // Per-person deposit: amount × total number of guests (adults + children)
      const totalGuests = totalAdults + totalChildren;
      depositAmount = Number(weddingGroup.deposit_value) * totalGuests;
    } else {
      // Percentage
      depositAmount = Math.round(totalAmount * Number(weddingGroup.deposit_value) / 100 * 100) / 100;
    }
    const finalAmount = totalAmount - depositAmount;

    // Create new booking rooms and update inventory
    for (const roomData of roomBlocksToBook) {
      await this.bookingRoomsRepository.create({
        uuid: uuidv4(),
        booking_id: booking.id,
        room_type_id: roomData.block.room_type_id,
        room_block_id: roomData.block.id,
        quantity: roomData.quantity,
        price_per_night: roomData.pricePerNight,
        total_nights: booking.total_nights,
        subtotal: roomData.subtotal,
        extra_person_charges: roomData.extraPersonCharges,
        price_breakdown: roomData.priceBreakdown,
        adults: roomData.adults,
        children: roomData.children,
      });

      // Update room block inventory
      await this.groupRoomBlocksRepository.update(
        { rooms_booked: roomData.block.rooms_booked + roomData.quantity },
        { where: { id: roomData.block.id } },
      );
    }

    // Update booking totals (including tax fields)
    await this.bookingsRepository.update(
      {
        total_rooms: totalRooms,
        total_adults: totalAdults,
        total_children: totalChildren,
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        final_amount: finalAmount,
      },
      { where: { uuid } },
    );

    // Emit event
    this.eventsService.emit(EventType.BOOKING_UPDATED, {
      booking_uuid: uuid,
      booking_reference: booking.booking_reference,
      updated_fields: ['rooms', 'total_amount', 'deposit_amount', 'final_amount'],
    });

    return this.getBookingByUuid(uuid);
  }

  // ==================== MODIFY ADDONS ====================

  // Update booking addons and recalculate totals
  async updateBookingAddons(
    uuid: string,
    addons: Array<{ addon_uuid: string; quantity: number }>,
  ) {
    const booking = await this.bookingsRepository.findOne({
      where: { uuid },
      include: [{ model: BookingRooms, as: 'booking_rooms' }],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Don't allow modifications on cancelled/completed bookings
    if (['cancelled', 'completed'].includes(booking.status)) {
      throw new BadRequestException(`Cannot modify addons on a ${booking.status} booking`);
    }

    // Get wedding group for deposit calculation
    const weddingGroup = await this.weddingGroupsRepository.findByPk(booking.wedding_group_id);
    if (!weddingGroup) {
      throw new NotFoundException('Wedding group not found');
    }

    // Delete current booking addons
    await this.bookingAddonsRepository.destroy({ where: { booking_id: booking.id } });

    // Get booking details for pricing calculation
    const totalNights = booking.total_nights || 1;
    const totalAdults = booking.total_adults || 2;
    const totalChildren = booking.total_children || 0;

    // Validate and create new addon bookings
    let addonsTotalAmount = 0;
    const addonsToBook: Array<{ addon: GroupAddons; quantity: number; unitPrice: number; subtotal: number }> = [];

    for (const addonDto of addons) {
      const addon = await this.groupAddonsRepository.findOne({
        where: { uuid: addonDto.addon_uuid, wedding_group_id: weddingGroup.id },
      });

      if (!addon) {
        throw new NotFoundException(`Addon ${addonDto.addon_uuid} not found`);
      }

      const unitPrice = Number(addon.price);
      // Get guest count based on applies_to setting
      const guestCount = this.getGuestCountForAddon(addon.applies_to, totalAdults, totalChildren);
      let addonCost = unitPrice * addonDto.quantity;

      // Calculate based on pricing_type
      switch (addon.pricing_type) {
        case 'per_night':
          addonCost *= totalNights;
          break;
        case 'per_guest':
          addonCost *= guestCount;
          break;
        case 'per_guest_per_night':
          addonCost *= guestCount * totalNights;
          break;
        case 'per_stay':
        default:
          // Flat fee, no multiplier needed
          break;
      }

      addonsTotalAmount += addonCost;

      addonsToBook.push({
        addon,
        quantity: addonDto.quantity,
        unitPrice,
        subtotal: addonCost,
      });
    }

    // Get existing room totals
    const roomsTotalAmount = booking.booking_rooms.reduce((sum, r) => sum + Number(r.subtotal), 0);

    // Calculate new totals WITH TAX (same as updateBookingRooms)
    const subtotal = roomsTotalAmount + addonsTotalAmount;
    const taxRate = Number(weddingGroup.tax_rate) || 0;
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const totalAmount = subtotal + taxAmount;

    // Calculate deposit based on wedding group settings
    let depositAmount: number;
    if (weddingGroup.deposit_type === 'fixed') {
      depositAmount = Number(weddingGroup.deposit_value);
    } else if (weddingGroup.deposit_type === 'per_person') {
      // Per-person deposit: amount × total number of guests (adults + children)
      const totalGuests = totalAdults + totalChildren;
      depositAmount = Number(weddingGroup.deposit_value) * totalGuests;
    } else {
      // Percentage - calculate on total INCLUDING tax (industry standard)
      depositAmount = Math.round((totalAmount * Number(weddingGroup.deposit_value)) / 100 * 100) / 100;
    }
    const finalAmount = totalAmount - depositAmount;

    // Create new booking addons
    for (const addonData of addonsToBook) {
      await this.bookingAddonsRepository.create({
        uuid: uuidv4(),
        booking_id: booking.id,
        group_addon_id: addonData.addon.id,
        addon_type: addonData.addon.addon_type || 'other',
        quantity: addonData.quantity,
        price: addonData.unitPrice,
        pricing_type: addonData.addon.pricing_type || 'per_stay',
        applies_to: addonData.addon.applies_to || 'all_guests',
        subtotal: addonData.subtotal,
      });
    }

    // Update booking totals (including tax fields)
    await this.bookingsRepository.update(
      {
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        final_amount: finalAmount,
      },
      { where: { uuid } },
    );

    // Emit event
    this.eventsService.emit(EventType.BOOKING_UPDATED, {
      booking_uuid: uuid,
      booking_reference: booking.booking_reference,
      updated_fields: ['addons', 'total_amount', 'deposit_amount', 'final_amount'],
    });

    return this.getBookingByUuid(uuid);
  }

  /**
   * Cancel flight transfer statuses when booking is cancelled
   * Sets both arrival and departure transfer statuses to 'cancelled'
   */
  private async cancelFlightTransfers(bookingId: number): Promise<void> {
    const flight = await this.guestFlightsRepository.findOne({
      where: { booking_id: bookingId },
    });

    if (flight) {
      await this.guestFlightsRepository.update(
        {
          arrival_transfer_status: 'cancelled',
          departure_transfer_status: 'cancelled',
        },
        { where: { booking_id: bookingId } },
      );
    }
  }
}
