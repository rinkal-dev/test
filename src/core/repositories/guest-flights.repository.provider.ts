/**
 * ============================================
 * GUEST FLIGHTS REPOSITORY PROVIDER
 * ============================================
 *
 * Factory provider that returns the correct repository
 * implementation based on DATABASE_PROVIDER config.
 *
 * Usage in module:
 *   providers: [GuestFlightsRepositoryProvider, ...GuestFlightsModelProviders]
 *
 * Usage in service:
 *   constructor(
 *     @Inject(GUEST_FLIGHTS_REPOSITORY) private guestFlightsRepository: IGuestFlightsRepository
 *   ) {}
 *
 * To switch database provider:
 *   Set DATABASE_PROVIDER=supabase in .env
 */

import { Provider } from '@nestjs/common';
import {
  GUEST_FLIGHTS_REPOSITORY as GUEST_FLIGHTS_MODEL,
  BOOKINGS_REPOSITORY,
  GUESTS_REPOSITORY,
  WEDDING_GROUPS_REPOSITORY,
} from '../../config/constants';
import { GuestFlights } from '../../models/GuestFlights';
import { Bookings } from '../../models/Bookings';
import { Guests } from '../../models/Guests';
import { WeddingGroups } from '../../models/WeddingGroups';
import {
  DatabaseProvider,
  getDatabaseConfig,
} from '../../config/database.config';
import { GUEST_FLIGHTS_REPOSITORY } from './guest-flights.repository.interface';
import { SequelizeGuestFlightsRepository } from './sequelize/sequelize-guest-flights.repository';
import { SupabaseGuestFlightsRepository } from './supabase/supabase-guest-flights.repository';

/**
 * Factory function to create the appropriate repository
 * based on DATABASE_PROVIDER configuration
 */
const guestFlightsRepositoryFactory = (
  guestFlightsModel: typeof GuestFlights,
  bookingsModel: typeof Bookings,
  guestsModel: typeof Guests,
  weddingGroupsModel: typeof WeddingGroups,
) => {
  const config = getDatabaseConfig();

  switch (config.provider) {
    case DatabaseProvider.SUPABASE:
      console.log('📦 Using Supabase Guest Flights Repository');
      return new SupabaseGuestFlightsRepository();

    case DatabaseProvider.SEQUELIZE:
    default:
      console.log('📦 Using Sequelize Guest Flights Repository');
      return new SequelizeGuestFlightsRepository(
        guestFlightsModel,
        bookingsModel,
        guestsModel,
        weddingGroupsModel,
      );
  }
};

/**
 * NestJS provider configuration for guest flights repository
 * This provider automatically switches between Sequelize and Supabase
 * based on the DATABASE_PROVIDER environment variable.
 */
export const GuestFlightsRepositoryProvider: Provider = {
  provide: GUEST_FLIGHTS_REPOSITORY,
  useFactory: guestFlightsRepositoryFactory,
  inject: ['GUEST_FLIGHTS_MODEL', 'BOOKINGS_MODEL', 'GUESTS_MODEL', 'WEDDING_GROUPS_MODEL'],
};

/**
 * Model providers for Sequelize injection
 */
export const GuestFlightsModelProviders: Provider[] = [
  {
    provide: 'GUEST_FLIGHTS_MODEL',
    useValue: GuestFlights,
  },
  {
    provide: 'BOOKINGS_MODEL',
    useValue: Bookings,
  },
  {
    provide: 'GUESTS_MODEL',
    useValue: Guests,
  },
  {
    provide: 'WEDDING_GROUPS_MODEL',
    useValue: WeddingGroups,
  },
];
