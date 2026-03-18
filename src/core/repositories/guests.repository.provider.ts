/**
 * ============================================
 * GUESTS REPOSITORY PROVIDER
 * ============================================
 *
 * Factory provider that returns the correct repository
 * implementation based on DATABASE_PROVIDER config.
 *
 * Usage in module:
 *   providers: [GuestsRepositoryProvider, GuestsModelProvider]
 *
 * Usage in service:
 *   constructor(
 *     @Inject(GUESTS_REPOSITORY) private guestsRepository: IGuestsRepository
 *   ) {}
 *
 * To switch database provider:
 *   Set DATABASE_PROVIDER=supabase in .env
 */

import { Provider } from '@nestjs/common';
import { Guests } from '../../models/Guests';
import {
  DatabaseProvider,
  getDatabaseConfig,
} from '../../config/database.config';
import { GUESTS_REPOSITORY } from './guests.repository.interface';
import { SequelizeGuestsRepository } from './sequelize/sequelize-guests.repository';
import { SupabaseGuestsRepository } from './supabase/supabase-guests.repository';

/**
 * Token for Sequelize Guests model injection (different from repository interface token)
 */
const GUESTS_MODEL_TOKEN = 'GUESTS_MODEL';

/**
 * Factory function to create the appropriate repository
 * based on DATABASE_PROVIDER configuration
 */
const guestsRepositoryFactory = (guestsModel: typeof Guests) => {
  const config = getDatabaseConfig();

  switch (config.provider) {
    case DatabaseProvider.SUPABASE:
      console.log('📦 Using Supabase Guests Repository');
      return new SupabaseGuestsRepository();

    case DatabaseProvider.SEQUELIZE:
    default:
      console.log('📦 Using Sequelize Guests Repository');
      return new SequelizeGuestsRepository(guestsModel);
  }
};

/**
 * NestJS provider configuration for guests repository
 * This provider automatically switches between Sequelize and Supabase
 * based on the DATABASE_PROVIDER environment variable.
 */
export const GuestsRepositoryProvider: Provider = {
  provide: GUESTS_REPOSITORY,
  useFactory: guestsRepositoryFactory,
  inject: [GUESTS_MODEL_TOKEN],
};

/**
 * Provider for Sequelize Guests model
 * Used by SequelizeGuestsRepository for database operations
 */
export const GuestsModelProvider: Provider = {
  provide: GUESTS_MODEL_TOKEN,
  useValue: Guests,
};
