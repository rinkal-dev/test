/**
 * ============================================
 * PUBLIC WEDDINGS PROVIDER
 * ============================================
 *
 * Provides repository dependencies for public wedding data access.
 */

import { WeddingGroups } from 'src/models/WeddingGroups';
import { Hotels } from 'src/models/Hotels';
import { GroupRoomBlocks } from 'src/models/GroupRoomBlocks';
import { GroupAddons } from 'src/models/GroupAddons';
import { CancellationPolicies } from 'src/models/CancellationPolicies';
import { GroupItinerary } from 'src/models/GroupItinerary';
import { RoomTypes } from 'src/models/RoomTypes';
import {
  WEDDING_GROUPS_REPOSITORY,
  HOTELS_REPOSITORY,
  GROUP_ROOM_BLOCKS_REPOSITORY,
  GROUP_ADDONS_REPOSITORY,
  CANCELLATION_POLICIES_REPOSITORY,
  GROUP_ITINERARY_REPOSITORY,
  ROOM_TYPES_REPOSITORY,
} from 'src/config/constants';

export const publicWeddingsProviders = [
  {
    provide: WEDDING_GROUPS_REPOSITORY,
    useValue: WeddingGroups,
  },
  {
    provide: HOTELS_REPOSITORY,
    useValue: Hotels,
  },
  {
    provide: GROUP_ROOM_BLOCKS_REPOSITORY,
    useValue: GroupRoomBlocks,
  },
  {
    provide: GROUP_ADDONS_REPOSITORY,
    useValue: GroupAddons,
  },
  {
    provide: CANCELLATION_POLICIES_REPOSITORY,
    useValue: CancellationPolicies,
  },
  {
    provide: GROUP_ITINERARY_REPOSITORY,
    useValue: GroupItinerary,
  },
  {
    provide: ROOM_TYPES_REPOSITORY,
    useValue: RoomTypes,
  },
];
