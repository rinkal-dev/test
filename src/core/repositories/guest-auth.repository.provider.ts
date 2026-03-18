/**
 * ============================================
 * GUEST AUTH REPOSITORY PROVIDER
 * ============================================
 *
 * Factory provider that returns the correct repository
 * implementation based on DATABASE_PROVIDER config.
 *
 * Usage in module:
 *   providers: [GuestAuthRepositoryProvider, ...GuestAuthModelProviders]
 *
 * Usage in service:
 *   constructor(
 *     @Inject(GUEST_AUTH_REPOSITORY) private repository: IGuestAuthRepository
 *   ) {}
 *
 * To switch database provider:
 *   Set DATABASE_PROVIDER=supabase in .env
 */

import { Provider } from '@nestjs/common';
import { GUESTS_REPOSITORY, BOOKINGS_REPOSITORY } from '../../config/constants';
import { Guests } from '../../models/Guests';
import { Bookings } from '../../models/Bookings';
import {
  DatabaseProvider,
  getDatabaseConfig,
} from '../../config/database.config';
import { GUEST_AUTH_REPOSITORY } from './guest-auth.repository.interface';
import { SequelizeGuestAuthRepository } from './sequelize/sequelize-guest-auth.repository';
import { SupabaseGuestAuthRepository } from './supabase/supabase-guest-auth.repository';

/**
 * Factory function to create the appropriate repository
 * based on DATABASE_PROVIDER configuration
 */
const guestAuthRepositoryFactory = (
  guestModel: typeof Guests,
  bookingModel: typeof Bookings,
) => {
  const config = getDatabaseConfig();

  switch (config.provider) {
    case DatabaseProvider.SUPABASE:
      console.log('📦 Using Supabase Guest Auth Repository');
      return new SupabaseGuestAuthRepository();

    case DatabaseProvider.SEQUELIZE:
    default:
      console.log('📦 Using Sequelize Guest Auth Repository');
      return new SequelizeGuestAuthRepository(guestModel, bookingModel);
  }
};

/**
 * NestJS provider configuration for guest auth repository
 */
export const GuestAuthRepositoryProvider: Provider = {
  provide: GUEST_AUTH_REPOSITORY,
  useFactory: guestAuthRepositoryFactory,
  inject: [GUESTS_REPOSITORY, BOOKINGS_REPOSITORY],
};

/**
 * Model providers for Sequelize (used as injection tokens)
 */
export const GuestAuthModelProviders: Provider[] = [
  {
    provide: GUESTS_REPOSITORY,
    useValue: Guests,
  },
  {
    provide: BOOKINGS_REPOSITORY,
    useValue: Bookings,
  },
];
