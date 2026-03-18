import {
  BOOKINGS_REPOSITORY,
  BOOKING_ROOMS_REPOSITORY,
  BOOKING_ADDONS_REPOSITORY,
  WEDDING_GROUPS_REPOSITORY,
  GUESTS_REPOSITORY,
  GROUP_ROOM_BLOCKS_REPOSITORY,
  GROUP_ADDONS_REPOSITORY,
  PAYMENTS_REPOSITORY,
  GUEST_FLIGHTS_REPOSITORY,
} from 'src/config/constants';
import {
  Bookings,
  BookingRooms,
  BookingAddons,
  WeddingGroups,
  Guests,
  GroupRoomBlocks,
  GroupAddons,
  Payments,
} from 'src/models';
import { GuestFlights } from 'src/models/GuestFlights';

export const bookingsProviders = [
  {
    provide: BOOKINGS_REPOSITORY,
    useValue: Bookings,
  },
  {
    provide: BOOKING_ROOMS_REPOSITORY,
    useValue: BookingRooms,
  },
  {
    provide: BOOKING_ADDONS_REPOSITORY,
    useValue: BookingAddons,
  },
  {
    provide: WEDDING_GROUPS_REPOSITORY,
    useValue: WeddingGroups,
  },
  {
    provide: GUESTS_REPOSITORY,
    useValue: Guests,
  },
  {
    provide: GROUP_ROOM_BLOCKS_REPOSITORY,
    useValue: GroupRoomBlocks,
  },
  {
    provide: GROUP_ADDONS_REPOSITORY,
    useValue: GroupAddons,
  },
  {
    provide: PAYMENTS_REPOSITORY,
    useValue: Payments,
  },
  {
    provide: GUEST_FLIGHTS_REPOSITORY,
    useValue: GuestFlights,
  },
];
