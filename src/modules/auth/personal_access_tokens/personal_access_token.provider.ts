import { PERSONAL_ACCESS_TOKENS_REPOSITORY } from 'src/config/constants';
import { PersonalAccessTokens } from 'src/models';

export const personalAccessTokensProviders = [
  {
    provide: PERSONAL_ACCESS_TOKENS_REPOSITORY,
    useValue: PersonalAccessTokens,
  },
];
