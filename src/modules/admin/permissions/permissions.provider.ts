import { PERMISSIONS_REPOSITORY } from 'src/config/constants';
import { Permissions } from 'src/models';

export const permissionsProviders = [
  {
    provide: PERMISSIONS_REPOSITORY,
    useValue: Permissions,
  },
];
