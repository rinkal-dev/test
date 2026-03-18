/**
 * ============================================
 * HOTEL REPOSITORY PROVIDER
 * ============================================
 *
 * Factory provider that returns the correct repository
 * implementation based on DATABASE_PROVIDER config.
 *
 * Usage in module:
 *   providers: [HotelRepositoryProvider]
 *
 * Usage in service:
 *   constructor(
 *     @Inject(HOTEL_REPOSITORY) private hotelRepository: IHotelRepository
 *   ) {}
 *
 * To switch database provider:
 *   Set DATABASE_PROVIDER=supabase in .env
 */

import { Provider } from '@nestjs/common';
import { HOTELS_REPOSITORY } from '../../config/constants';
import { Hotels } from '../../models/Hotels';
import {
  DatabaseProvider,
  getDatabaseConfig,
} from '../../config/database.config';
import { HOTEL_REPOSITORY } from './hotel.repository.interface';
import { SequelizeHotelRepository } from './sequelize/sequelize-hotel.repository';
import { SupabaseHotelRepository } from './supabase/supabase-hotel.repository';

/**
 * Factory function to create the appropriate repository
 * based on DATABASE_PROVIDER configuration
 */
const hotelRepositoryFactory = (hotelsModel: typeof Hotels) => {
  const config = getDatabaseConfig();

  switch (config.provider) {
    case DatabaseProvider.SUPABASE:
      console.log('📦 Using Supabase Hotel Repository');
      return new SupabaseHotelRepository();

    case DatabaseProvider.SEQUELIZE:
    default:
      console.log('📦 Using Sequelize Hotel Repository');
      return new SequelizeHotelRepository(hotelsModel);
  }
};

/**
 * NestJS provider configuration for hotel repository
 * This provider automatically switches between Sequelize and Supabase
 * based on the DATABASE_PROVIDER environment variable.
 */
export const HotelRepositoryProvider: Provider = {
  provide: HOTEL_REPOSITORY,
  useFactory: hotelRepositoryFactory,
  inject: [HOTELS_REPOSITORY],
};

/**
 * Provider for existing HOTELS_REPOSITORY (Sequelize model)
 * Kept for backward compatibility and for SequelizeHotelRepository injection
 */
export const HotelsModelProvider: Provider = {
  provide: HOTELS_REPOSITORY,
  useValue: Hotels,
};
