import { COUNTRIES_REPOSITORY } from 'src/config/constants';
import { Countries } from 'src/models';

export const countriesProviders = [
  {
    provide: COUNTRIES_REPOSITORY,
    useValue: Countries,
  },
];
