import { SOCIAL_LOGINS_REPOSITORY } from 'src/config/constants';
import { SocialLogins } from 'src/models';

export const socialLoginsProviders = [
  {
    provide: SOCIAL_LOGINS_REPOSITORY,
    useValue: SocialLogins,
  },
];
