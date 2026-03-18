/**
 * ============================================
 * GROUP ITINERARY PROVIDERS
 * ============================================
 *
 * Provider configuration for Group Itinerary module.
 */

import { GroupItinerary } from 'src/models/GroupItinerary';
import { WeddingGroups } from 'src/models/WeddingGroups';
import { GROUP_ITINERARY_REPOSITORY, WEDDING_GROUPS_REPOSITORY } from 'src/config/constants';

/**
 * Group itinerary providers array
 */
export const groupItineraryProviders = [
  {
    provide: GROUP_ITINERARY_REPOSITORY,
    useValue: GroupItinerary,
  },
  {
    provide: WEDDING_GROUPS_REPOSITORY,
    useValue: WeddingGroups,
  },
];
