/**
 * ============================================
 * WEDDING GROUPS PROVIDERS
 * ============================================
 *
 * Provider configuration for Wedding Groups module.
 * Uses the repository pattern for database abstraction.
 *
 * Switching database:
 * - Set DATABASE_PROVIDER=supabase in .env
 * - No code changes required!
 */

import { WeddingGroups } from 'src/models/WeddingGroups';
import { Hotels } from 'src/models/Hotels';
import { Currencies } from 'src/models/Currencies';
import { Bookings } from 'src/models/Bookings';
import { Payments } from 'src/models/Payments';
import { WEDDING_GROUPS_REPOSITORY, HOTELS_REPOSITORY, CURRENCIES_REPOSITORY, BOOKINGS_REPOSITORY, PAYMENTS_REPOSITORY } from 'src/config/constants';
import {
  WeddingGroupRepositoryProvider,
} from '../../../core/repositories/wedding-group.repository.provider';

/**
 * Wedding groups providers array
 * Includes both the Sequelize model (for backward compatibility)
 * and the abstracted repository provider
 */
export const weddingGroupsProviders = [
  // Legacy Sequelize model provider (used by SequelizeWeddingGroupRepository)
  {
    provide: WEDDING_GROUPS_REPOSITORY,
    useValue: WeddingGroups,
  },
  // Hotels model provider (for looking up hotel ID from UUID)
  {
    provide: HOTELS_REPOSITORY,
    useValue: Hotels,
  },
  // Currencies model provider (for validating currency codes)
  {
    provide: CURRENCIES_REPOSITORY,
    useValue: Currencies,
  },
  // Bookings model provider (for checking if group has bookings)
  {
    provide: BOOKINGS_REPOSITORY,
    useValue: Bookings,
  },
  // Payments model provider (for checking payment states)
  {
    provide: PAYMENTS_REPOSITORY,
    useValue: Payments,
  },
  // Abstracted repository provider (auto-switches based on DATABASE_PROVIDER)
  WeddingGroupRepositoryProvider,
];
