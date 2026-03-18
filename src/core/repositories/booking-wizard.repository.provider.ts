/**
 * ============================================
 * BOOKING WIZARD REPOSITORY PROVIDER
 * ============================================
 *
 * Factory provider that returns the correct repository
 * implementation based on DATABASE_PROVIDER config.
 *
 * Usage in module:
 *   providers: [BookingWizardRepositoryProvider, ...modelProviders]
 *
 * Usage in service:
 *   constructor(
 *     @Inject(BOOKING_WIZARD_REPOSITORY) private repository: IBookingWizardRepository
 *   ) {}
 *
 * To switch database provider:
 *   Set DATABASE_PROVIDER=supabase in .env
 */

import { Provider } from '@nestjs/common';
import {
  WEDDING_GROUPS_REPOSITORY,
  GROUP_ROOM_BLOCKS_REPOSITORY,
  GROUP_ADDONS_REPOSITORY,
  GUESTS_REPOSITORY,
  BOOKINGS_REPOSITORY,
  BOOKING_ROOMS_REPOSITORY,
  BOOKING_ADDONS_REPOSITORY,
  BOOKING_HOLDS_REPOSITORY,
} from '../../config/constants';
import { WeddingGroups } from '../../models/WeddingGroups';
import { GroupRoomBlocks } from '../../models/GroupRoomBlocks';
import { GroupAddons } from '../../models/GroupAddons';
import { Guests } from '../../models/Guests';
import { Bookings } from '../../models/Bookings';
import { BookingRooms } from '../../models/BookingRooms';
import { BookingAddons } from '../../models/BookingAddons';
import { BookingHolds } from '../../models/BookingHolds';
import {
  DatabaseProvider,
  getDatabaseConfig,
} from '../../config/database.config';
import { BOOKING_WIZARD_REPOSITORY } from './booking-wizard.repository.interface';
import { SequelizeBookingWizardRepository } from './sequelize/sequelize-booking-wizard.repository';
import { SupabaseBookingWizardRepository } from './supabase/supabase-booking-wizard.repository';

/**
 * Factory function to create the appropriate repository
 * based on DATABASE_PROVIDER configuration
 */
const bookingWizardRepositoryFactory = (
  weddingGroupModel: typeof WeddingGroups,
  roomBlockModel: typeof GroupRoomBlocks,
  addonModel: typeof GroupAddons,
  guestModel: typeof Guests,
  bookingModel: typeof Bookings,
  bookingRoomModel: typeof BookingRooms,
  bookingAddonModel: typeof BookingAddons,
  bookingHoldModel: typeof BookingHolds,
) => {
  const config = getDatabaseConfig();

  switch (config.provider) {
    case DatabaseProvider.SUPABASE:
      console.log('📦 Using Supabase Booking Wizard Repository');
      return new SupabaseBookingWizardRepository();

    case DatabaseProvider.SEQUELIZE:
    default:
      console.log('📦 Using Sequelize Booking Wizard Repository');
      return new SequelizeBookingWizardRepository(
        weddingGroupModel,
        roomBlockModel,
        addonModel,
        guestModel,
        bookingModel,
        bookingRoomModel,
        bookingAddonModel,
        bookingHoldModel,
      );
  }
};

/**
 * NestJS provider configuration for booking wizard repository
 */
export const BookingWizardRepositoryProvider: Provider = {
  provide: BOOKING_WIZARD_REPOSITORY,
  useFactory: bookingWizardRepositoryFactory,
  inject: [
    WEDDING_GROUPS_REPOSITORY,
    GROUP_ROOM_BLOCKS_REPOSITORY,
    GROUP_ADDONS_REPOSITORY,
    GUESTS_REPOSITORY,
    BOOKINGS_REPOSITORY,
    BOOKING_ROOMS_REPOSITORY,
    BOOKING_ADDONS_REPOSITORY,
    BOOKING_HOLDS_REPOSITORY,
  ],
};

/**
 * Model providers for Sequelize (used as injection tokens)
 */
export const BookingWizardModelProviders: Provider[] = [
  {
    provide: WEDDING_GROUPS_REPOSITORY,
    useValue: WeddingGroups,
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
    provide: GUESTS_REPOSITORY,
    useValue: Guests,
  },
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
    provide: BOOKING_HOLDS_REPOSITORY,
    useValue: BookingHolds,
  },
];
