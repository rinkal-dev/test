import { CITIES_REPOSITORY } from 'src/config/constants';
import { Cities } from 'src/models';

export const citiesProviders = [
  {
    provide: CITIES_REPOSITORY,
    useValue: Cities,
  },
];
