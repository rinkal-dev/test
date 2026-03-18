/**
 * ============================================
 * ROOM BLOCKS PROVIDERS
 * ============================================
 *
 * Provider configuration for Room Blocks module.
 */

import { GroupRoomBlocks } from 'src/models/GroupRoomBlocks';
import { WeddingGroups } from 'src/models/WeddingGroups';
import { RoomTypes } from 'src/models/RoomTypes';
import { Bookings } from 'src/models/Bookings';
import { GROUP_ROOM_BLOCKS_REPOSITORY, WEDDING_GROUPS_REPOSITORY, ROOM_TYPES_REPOSITORY, BOOKINGS_REPOSITORY } from 'src/config/constants';

/**
 * Room blocks providers array
 */
export const roomBlocksProviders = [
  {
    provide: GROUP_ROOM_BLOCKS_REPOSITORY,
    useValue: GroupRoomBlocks,
  },
  {
    provide: WEDDING_GROUPS_REPOSITORY,
    useValue: WeddingGroups,
  },
  {
    provide: ROOM_TYPES_REPOSITORY,
    useValue: RoomTypes,
  },
  {
    provide: BOOKINGS_REPOSITORY,
    useValue: Bookings,
  },
];
