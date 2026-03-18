/**
 * ============================================
 * GROUP ADDONS PROVIDERS
 * ============================================
 *
 * Provider configuration for Group Addons module.
 */

import { GroupAddons } from 'src/models/GroupAddons';
import { WeddingGroups } from 'src/models/WeddingGroups';
import { Bookings } from 'src/models/Bookings';
import { GROUP_ADDONS_REPOSITORY, WEDDING_GROUPS_REPOSITORY, BOOKINGS_REPOSITORY } from 'src/config/constants';

/**
 * Group addons providers array
 */
export const groupAddonsProviders = [
  {
    provide: GROUP_ADDONS_REPOSITORY,
    useValue: GroupAddons,
  },
  {
    provide: WEDDING_GROUPS_REPOSITORY,
    useValue: WeddingGroups,
  },
  {
    provide: BOOKINGS_REPOSITORY,
    useValue: Bookings,
  },
];
