/**
 * ============================================
 * USER REPOSITORY PROVIDER
 * ============================================
 */

import { Provider } from '@nestjs/common';
import { USERS_REPOSITORY } from '../../config/constants';
import { Users } from '../../models/Users';
import { DatabaseProvider, getDatabaseConfig } from '../../config/database.config';
import { USER_REPOSITORY } from './user.repository.interface';
import { SequelizeUserRepository } from './sequelize/sequelize-user.repository';
import { SupabaseUserRepository } from './supabase/supabase-user.repository';

const userRepositoryFactory = (usersModel: typeof Users) => {
  const config = getDatabaseConfig();
  switch (config.provider) {
    case DatabaseProvider.SUPABASE:
      console.log('📦 Using Supabase User Repository');
      return new SupabaseUserRepository();
    case DatabaseProvider.SEQUELIZE:
    default:
      console.log('📦 Using Sequelize User Repository');
      return new SequelizeUserRepository(usersModel);
  }
};

export const UserRepositoryProvider: Provider = {
  provide: USER_REPOSITORY,
  useFactory: userRepositoryFactory,
  inject: [USERS_REPOSITORY],
};

export const UsersModelProvider: Provider = {
  provide: USERS_REPOSITORY,
  useValue: Users,
};
