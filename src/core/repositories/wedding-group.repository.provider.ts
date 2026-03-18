/**
 * ============================================
 * WEDDING GROUP REPOSITORY PROVIDER
 * ============================================
 *
 * Factory provider that returns the correct repository
 * implementation based on DATABASE_PROVIDER config.
 *
 * Usage in module:
 *   providers: [WeddingGroupRepositoryProvider]
 *
 * Usage in service:
 *   constructor(
 *     @Inject(WEDDING_GROUP_REPOSITORY) private weddingGroupRepository: IWeddingGroupRepository
 *   ) {}
 *
 * To switch database provider:
 *   Set DATABASE_PROVIDER=supabase in .env
 */

import { Provider } from '@nestjs/common';
import { WEDDING_GROUPS_REPOSITORY } from '../../config/constants';
import { WeddingGroups } from '../../models/WeddingGroups';
import {
  DatabaseProvider,
  getDatabaseConfig,
} from '../../config/database.config';
import { WEDDING_GROUP_REPOSITORY } from './wedding-group.repository.interface';
import { SequelizeWeddingGroupRepository } from './sequelize/sequelize-wedding-group.repository';

/**
 * Factory function to create the appropriate repository
 * based on DATABASE_PROVIDER configuration
 */
const weddingGroupRepositoryFactory = (weddingGroupsModel: typeof WeddingGroups) => {
  const config = getDatabaseConfig();

  switch (config.provider) {
    // TODO: Add Supabase implementation when needed
    // case DatabaseProvider.SUPABASE:
    //   console.log('📦 Using Supabase Wedding Group Repository');
    //   return new SupabaseWeddingGroupRepository();

    case DatabaseProvider.SEQUELIZE:
    default:
      console.log('📦 Using Sequelize Wedding Group Repository');
      return new SequelizeWeddingGroupRepository(weddingGroupsModel);
  }
};

/**
 * NestJS provider configuration for wedding group repository
 * This provider automatically switches between Sequelize and Supabase
 * based on the DATABASE_PROVIDER environment variable.
 */
export const WeddingGroupRepositoryProvider: Provider = {
  provide: WEDDING_GROUP_REPOSITORY,
  useFactory: weddingGroupRepositoryFactory,
  inject: [WEDDING_GROUPS_REPOSITORY],
};

/**
 * Provider for existing WEDDING_GROUPS_REPOSITORY (Sequelize model)
 * Kept for backward compatibility and for SequelizeWeddingGroupRepository injection
 */
export const WeddingGroupsModelProvider: Provider = {
  provide: WEDDING_GROUPS_REPOSITORY,
  useValue: WeddingGroups,
};
