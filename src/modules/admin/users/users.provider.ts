/**
 * ============================================
 * USERS PROVIDERS
 * ============================================
 */

import {
  USERS_REPOSITORY,
  PASSWORD_RESETS_REPOSITORY,
} from 'src/config/constants';
import { PasswordResets, Users } from 'src/models';
import { UserRepositoryProvider } from '../../../core/repositories';

export const usersProviders = [
  // Legacy Sequelize model providers
  {
    provide: USERS_REPOSITORY,
    useValue: Users,
  },
  {
    provide: PASSWORD_RESETS_REPOSITORY,
    useValue: PasswordResets,
  },
  // Abstracted repository provider
  UserRepositoryProvider,
];
