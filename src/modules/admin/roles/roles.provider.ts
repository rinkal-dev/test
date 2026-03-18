import {
  ROLES_REPOSITORY,
  ROLE_HAS_PERMISSIONS_REPOSITORY,
  MODEL_HAS_ROLES_REPOSITORY,
} from 'src/config/constants';
import { RoleHasPermissions, Roles, ModelHasRoles } from 'src/models';

export const rolesProvider = [
  {
    provide: ROLES_REPOSITORY,
    useValue: Roles,
  },
  {
    provide: ROLE_HAS_PERMISSIONS_REPOSITORY,
    useValue: RoleHasPermissions,
  },
  {
    provide: MODEL_HAS_ROLES_REPOSITORY,
    useValue: ModelHasRoles,
  },
];
