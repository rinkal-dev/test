import { CURRENCIES_REPOSITORY } from 'src/config/constants';
import { Currencies } from 'src/models';

export const currenciesProviders = [
  {
    provide: CURRENCIES_REPOSITORY,
    useValue: Currencies,
  },
];
