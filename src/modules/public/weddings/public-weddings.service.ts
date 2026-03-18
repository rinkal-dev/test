/**
 * ============================================
 * PUBLIC WEDDINGS SERVICE
 * ============================================
 *
 * Service for fetching public wedding data.
 * This is used by guests to view wedding details and make bookings.
 * No authentication required.
 */

import { Inject, Injectable } from '@nestjs/common';
import { WeddingGroups } from 'src/models/WeddingGroups';
import { Hotels } from 'src/models/Hotels';
import { GroupRoomBlocks } from 'src/models/GroupRoomBlocks';
import { GroupAddons } from 'src/models/GroupAddons';
import { CancellationPolicies } from 'src/models/CancellationPolicies';
import { GroupItinerary } from 'src/models/GroupItinerary';
import { RoomTypes } from 'src/models/RoomTypes';
import { Amenities } from 'src/models/Amenities';
import {
  WEDDING_GROUPS_REPOSITORY,
  HOTELS_REPOSITORY,
  GROUP_ROOM_BLOCKS_REPOSITORY,
  GROUP_ADDONS_REPOSITORY,
  CANCELLATION_POLICIES_REPOSITORY,
  GROUP_ITINERARY_REPOSITORY,
} from 'src/config/constants';

export interface PublicWeddingData {
  wedding: {
    uuid: string;
    name: string;
    bride_name: string;
    groom_name: string;
    event_start_date: string;
    event_end_date: string;
    booking_window_start: string;
    booking_window_end: string;
    booking_link: string;
    deposit_type: string;
    deposit_value: number;
    final_payment_due_days: number;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    whatsapp_enabled: boolean;
    status: string;
    welcome_message: string | null;
    image_url: string | null;
    tax_rate: number;
    currency_code: string;
    currency: {
      code: string;
      name: string;
      symbol: string;
      decimal_places: number;
    };
    // Bride contact
    bride_email: string | null;
    bride_phone: string | null;
    // Groom contact
    groom_email: string | null;
    groom_phone: string | null;
    // Hotel contact
    hotel_contact_name: string | null;
    hotel_contact_email: string | null;
    hotel_contact_phone: string | null;
  };
  hotel: {
    uuid: string;
    name: string;
    slug: string;
    address: string;
    city: string;
    state: string | null;
    country: string;
    postal_code: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    description: string | null;
    check_in_time: string;
    check_out_time: string;
    star_rating: number | null;
    latitude: number | null;
    longitude: number | null;
    amenities: string[] | null;
    image_url: string | null;
    gallery_images: string[] | null;
  };
  room_blocks: Array<{
    uuid: string;
    rooms_allocated: number;
    rooms_available: number;
    price_per_night: number;
    min_nights: number | null;
    max_nights: number | null;
    is_active: boolean;
    room_type: {
      uuid: string;
      name: string;
      slug: string;
      description: string | null;
      bed_type: string | null;
      room_size: string | null;
      max_occupancy: number;
      max_adults: number;
      max_children: number;
      base_price: number;
      amenities: any;
      image_url: string | null;
      gallery_images: string[] | null;
    };
  }>;
  addons: Array<{
    uuid: string;
    name: string;
    description: string | null;
    addon_type: string;
    price: number;
    pricing_type: 'per_stay' | 'per_night' | 'per_guest' | 'per_guest_per_night';
    max_quantity: number | null;
    is_active: boolean;
  }>;
  itinerary: Array<{
    uuid: string;
    event_date: string;
    event_time: string | null;
    title: string;
    description: string | null;
    location: string | null;
    icon_type: string;
    sort_order: number;
  }>;
  cancellation_policies: Array<{
    uuid: string;
    days_before_event: number;
    refund_percentage: number;
    description: string | null;
  }>;
  booking_status: {
    is_booking_open: boolean;
    booking_opens_on: string;
    booking_closes_on: string;
    days_until_booking_opens: number | null;
    days_until_booking_closes: number | null;
  };
}

@Injectable()
export class PublicWeddingsService {
  constructor(
    @Inject(WEDDING_GROUPS_REPOSITORY) private weddingGroupsModel: typeof WeddingGroups,
    @Inject(HOTELS_REPOSITORY) private hotelsModel: typeof Hotels,
    @Inject(GROUP_ROOM_BLOCKS_REPOSITORY) private roomBlocksModel: typeof GroupRoomBlocks,
    @Inject(GROUP_ADDONS_REPOSITORY) private addonsModel: typeof GroupAddons,
    @Inject(CANCELLATION_POLICIES_REPOSITORY) private policiesModel: typeof CancellationPolicies,
    @Inject(GROUP_ITINERARY_REPOSITORY) private itineraryModel: typeof GroupItinerary,
  ) {}

  /**
   * Get public wedding data by booking link (slug)
   * Returns all data needed for the public wedding/booking page
   */
  async getByBookingLink(bookingLink: string): Promise<PublicWeddingData | null> {
    // Find the wedding group by booking_link
    const wedding = await this.weddingGroupsModel.findOne({
      where: { booking_link: bookingLink },
      include: [
        {
          model: Hotels,
          as: 'hotel',
          include: [
            {
              model: Amenities,
              as: 'amenities_list',
              attributes: ['name', 'icon', 'category'],
              through: { attributes: [] }, // Don't include junction table attributes
            },
          ],
        },
      ],
    });

    if (!wedding) {
      return null;
    }

    // Only return data for active weddings (or draft for preview)
    if (!['active', 'draft'].includes(wedding.status)) {
      return null;
    }

    // Get room blocks with room types
    const roomBlocks = await this.roomBlocksModel.findAll({
      where: {
        wedding_group_id: wedding.id,
        is_active: true,
      },
      include: [
        {
          model: RoomTypes,
          as: 'room_type',
        },
      ],
      order: [['created_at', 'ASC']],
    });

    // Get addons
    const addons = await this.addonsModel.findAll({
      where: {
        wedding_group_id: wedding.id,
        is_active: true,
      },
      order: [['created_at', 'ASC']],
    });

    // Get itinerary
    const itinerary = await this.itineraryModel.findAll({
      where: { wedding_group_id: wedding.id },
      order: [['event_date', 'ASC'], ['sort_order', 'ASC']],
    });

    // Get cancellation policies
    const policies = await this.policiesModel.findAll({
      where: {
        wedding_group_id: wedding.id,
        is_active: true,
      },
      order: [['days_before_event', 'DESC']],
    });

    // Calculate booking status
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // booking_window_start = Earliest Check-In date (NOT when booking opens)
    // booking_window_end = Booking Deadline (last date to make a booking)
    const earliestCheckIn = new Date(wedding.booking_window_start);
    const bookingDeadline = new Date(wedding.booking_window_end);
    bookingDeadline.setHours(23, 59, 59, 999);

    // Booking is open if: today is before/on the deadline AND wedding is active
    // Note: We don't check "today >= earliestCheckIn" because guests should be able to
    // book NOW for a FUTURE check-in date. The earliestCheckIn is the minimum
    // check-in date guests can SELECT, not when bookings open.
    const isBookingOpen = today <= bookingDeadline && wedding.status === 'active';

    // Days until booking opens - not used since booking is open immediately when group is active
    const daysUntilOpens: number | null = null;

    const daysUntilCloses = bookingDeadline > today
      ? Math.ceil((bookingDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Get currency info for display
    const currencyCode = wedding.currency_code || 'USD';
    const currencyMap: Record<string, { name: string; symbol: string; decimal_places: number }> = {
      USD: { name: 'US Dollar', symbol: '$', decimal_places: 2 },
      CAD: { name: 'Canadian Dollar', symbol: 'CA$', decimal_places: 2 },
      EUR: { name: 'Euro', symbol: '€', decimal_places: 2 },
      GBP: { name: 'British Pound', symbol: '£', decimal_places: 2 },
      MXN: { name: 'Mexican Peso', symbol: 'MX$', decimal_places: 2 },
      AUD: { name: 'Australian Dollar', symbol: 'A$', decimal_places: 2 },
    };
    const currencyInfo = currencyMap[currencyCode] || currencyMap['USD'];

    return {
      wedding: {
        uuid: wedding.uuid,
        name: wedding.name,
        bride_name: wedding.bride_name,
        groom_name: wedding.groom_name,
        event_start_date: wedding.event_start_date,
        event_end_date: wedding.event_end_date,
        booking_window_start: wedding.booking_window_start,
        booking_window_end: wedding.booking_window_end,
        booking_link: wedding.booking_link,
        deposit_type: wedding.deposit_type,
        deposit_value: Number(wedding.deposit_value),
        final_payment_due_days: wedding.final_payment_due_days,
        contact_name: wedding.contact_name,
        contact_email: wedding.contact_email,
        contact_phone: wedding.contact_phone,
        whatsapp_enabled: wedding.whatsapp_enabled,
        status: wedding.status,
        welcome_message: wedding.welcome_message,
        image_url: wedding.image_url,
        tax_rate: wedding.tax_rate !== null && wedding.tax_rate !== undefined ? Number(wedding.tax_rate) : 15,
        currency_code: currencyCode,
        currency: {
          code: currencyCode,
          name: currencyInfo.name,
          symbol: currencyInfo.symbol,
          decimal_places: currencyInfo.decimal_places,
        },
        // Bride contact
        bride_email: wedding.bride_email,
        bride_phone: wedding.bride_phone,
        // Groom contact
        groom_email: wedding.groom_email,
        groom_phone: wedding.groom_phone,
        // Hotel contact
        hotel_contact_name: wedding.hotel_contact_name,
        hotel_contact_email: wedding.hotel_contact_email,
        hotel_contact_phone: wedding.hotel_contact_phone,
      },
      hotel: wedding.hotel ? {
        uuid: wedding.hotel.uuid,
        name: wedding.hotel.name,
        slug: wedding.hotel.slug,
        address: wedding.hotel.address,
        city: wedding.hotel.city,
        state: wedding.hotel.state,
        country: wedding.hotel.country,
        postal_code: wedding.hotel.postal_code,
        phone: wedding.hotel.phone,
        email: wedding.hotel.email,
        website: wedding.hotel.website,
        description: wedding.hotel.description,
        check_in_time: wedding.hotel.check_in_time,
        check_out_time: wedding.hotel.check_out_time,
        star_rating: wedding.hotel.star_rating,
        latitude: wedding.hotel.latitude ? Number(wedding.hotel.latitude) : null,
        longitude: wedding.hotel.longitude ? Number(wedding.hotel.longitude) : null,
        amenities: wedding.hotel.amenities_list?.map((a: any) => a.name) || wedding.hotel.amenities || [],
        image_url: wedding.hotel.image_url,
        gallery_images: wedding.hotel.gallery_images,
      } : null,
      room_blocks: roomBlocks.map(block => ({
        uuid: block.uuid,
        rooms_allocated: block.rooms_allocated,
        rooms_available: block.rooms_allocated - block.rooms_booked,
        price_per_night: Number(block.price_per_night),
        min_nights: block.min_nights,
        max_nights: block.max_nights,
        is_active: block.is_active,
        room_type: block.room_type ? {
          uuid: block.room_type.uuid,
          name: block.room_type.name,
          slug: block.room_type.slug,
          description: block.room_type.description,
          bed_type: block.room_type.bed_type,
          room_size: block.room_type.room_size,
          max_occupancy: block.room_type.max_occupancy,
          max_adults: block.room_type.max_adults,
          max_children: block.room_type.max_children,
          base_price: Number(block.room_type.base_price),
          amenities: block.room_type.amenities,
          image_url: block.room_type.image_url,
          gallery_images: block.room_type.gallery_images,
        } : null,
      })),
      addons: addons.map(addon => ({
        uuid: addon.uuid,
        name: addon.name,
        description: addon.description,
        addon_type: addon.addon_type,
        price: Number(addon.price),
        pricing_type: addon.pricing_type,
        max_quantity: addon.max_quantity,
        is_active: addon.is_active,
      })),
      itinerary: itinerary.map(item => ({
        uuid: item.uuid,
        event_date: item.event_date,
        event_time: item.event_time,
        title: item.title,
        description: item.description,
        location: item.location,
        icon_type: item.icon_type,
        sort_order: item.sort_order,
      })),
      cancellation_policies: policies.map(policy => ({
        uuid: policy.uuid,
        days_before_event: policy.days_before_event,
        refund_percentage: Number(policy.refund_percentage),
        description: policy.description,
      })),
      booking_status: {
        is_booking_open: isBookingOpen,
        booking_opens_on: wedding.booking_window_start,
        booking_closes_on: wedding.booking_window_end,
        days_until_booking_opens: daysUntilOpens,
        days_until_booking_closes: daysUntilCloses,
      },
    };
  }

  /**
   * Check if a booking link exists and is valid
   */
  async isValidBookingLink(bookingLink: string): Promise<boolean> {
    const count = await this.weddingGroupsModel.count({
      where: {
        booking_link: bookingLink,
        status: 'active',
      },
    });
    return count > 0;
  }

  /**
   * Get list of public weddings for browsing
   * Returns active weddings that are open for booking
   */
  async getPublicWeddingsList(): Promise<Array<{
    uuid: string;
    booking_link: string;
    couple_name: string;
    event_start_date: string;
    hotel_name: string;
    hotel_city: string;
    hotel_country: string;
    image_url: string | null;
    status: string;
  }>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weddings = await this.weddingGroupsModel.findAll({
      where: {
        status: 'active',
      },
      attributes: ['uuid', 'booking_link', 'bride_name', 'groom_name', 'event_start_date', 'booking_window_end', 'image_url', 'status'],
      include: [
        {
          model: Hotels,
          as: 'hotel',
          attributes: ['name', 'city', 'country', 'image_url'],
        },
      ],
      order: [['event_start_date', 'ASC']],
      limit: 20,
    });

    // Filter to only include weddings where booking is still open
    return weddings
      .filter(wedding => {
        const bookingDeadline = new Date(wedding.booking_window_end);
        bookingDeadline.setHours(23, 59, 59, 999);
        return today <= bookingDeadline;
      })
      .map(wedding => ({
        uuid: wedding.uuid,
        booking_link: wedding.booking_link,
        couple_name: `${wedding.bride_name} & ${wedding.groom_name}`,
        event_start_date: wedding.event_start_date,
        hotel_name: wedding.hotel?.name || 'TBA',
        hotel_city: wedding.hotel?.city || '',
        hotel_country: wedding.hotel?.country || '',
        image_url: wedding.image_url || wedding.hotel?.image_url || null,
        status: wedding.status,
      }));
  }

  /**
   * Get minimal wedding info for preview (before full page load)
   */
  async getPreviewInfo(bookingLink: string): Promise<{
    name: string;
    bride_name: string;
    groom_name: string;
    event_start_date: string;
    hotel_name: string;
  } | null> {
    const wedding = await this.weddingGroupsModel.findOne({
      where: { booking_link: bookingLink },
      attributes: ['name', 'bride_name', 'groom_name', 'event_start_date'],
      include: [
        {
          model: Hotels,
          as: 'hotel',
          attributes: ['name'],
        },
      ],
    });

    if (!wedding) {
      return null;
    }

    return {
      name: wedding.name,
      bride_name: wedding.bride_name,
      groom_name: wedding.groom_name,
      event_start_date: wedding.event_start_date,
      hotel_name: wedding.hotel?.name || '',
    };
  }
}
