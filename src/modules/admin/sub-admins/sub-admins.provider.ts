import {
  ADMINS_REPOSITORY,
  ADMIN_PASSWORD_RESETS_REPOSITORY,
  MODEL_HAS_ROLES_REPOSITORY,
} from 'src/config/constants';
import { AdminPasswordResets, Admins, ModelHasRoles } from 'src/models';

export const adminsProviders = [
  {
    provide: ADMINS_REPOSITORY,
    useValue: Admins,
  },
  {
    provide: ADMIN_PASSWORD_RESETS_REPOSITORY,
    useValue: AdminPasswordResets,
  },
  {
    provide: MODEL_HAS_ROLES_REPOSITORY,
    useValue: ModelHasRoles,
  },
];
