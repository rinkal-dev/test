import { CONTENT_PAGES_REPOSITORY } from 'src/config/constants';
import { ContentPages } from 'src/models';

export const contentPagesProviders = [
  {
    provide: CONTENT_PAGES_REPOSITORY,
    useValue: ContentPages,
  },
];
