import { API_KEYS_REPOSITORY } from 'src/config/constants';
import { ApiKeys } from 'src/models';

export const apiKeysProviders = [
  {
    provide: API_KEYS_REPOSITORY,
    useValue: ApiKeys,
  },
];
