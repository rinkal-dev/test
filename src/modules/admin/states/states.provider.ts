import { STATES_REPOSITORY } from 'src/config/constants';
import { States } from 'src/models';

export const statesProviders = [
  {
    provide: STATES_REPOSITORY,
    useValue: States,
  },
];
