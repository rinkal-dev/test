/**
 * ============================================
 * HOTELS PROVIDERS
 * ============================================
 *
 * Provider configuration for Hotels module.
 * Uses the repository pattern for database abstraction.
 *
 * Switching database:
 * - Set DATABASE_PROVIDER=supabase in .env
 * - No code changes required!
 */

import { Hotels } from 'src/models/Hotels';
import { HOTELS_REPOSITORY } from 'src/config/constants';
import {
  HotelRepositoryProvider,
} from '../../../core/repositories';

/**
 * Hotels providers array
 * Includes both the Sequelize model (for backward compatibility)
 * and the abstracted repository provider
 */
export const hotelsProviders = [
  // Legacy Sequelize model provider (used by SequelizeHotelRepository)
  {
    provide: HOTELS_REPOSITORY,
    useValue: Hotels,
  },
  // Abstracted repository provider (auto-switches based on DATABASE_PROVIDER)
  HotelRepositoryProvider,
];
