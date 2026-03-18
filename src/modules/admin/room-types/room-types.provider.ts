import { RoomTypes } from 'src/models/RoomTypes';
import { ROOM_TYPES_REPOSITORY } from 'src/config/constants';

export const roomTypesProviders = [
  {
    provide: ROOM_TYPES_REPOSITORY,
    useValue: RoomTypes,
  },
];
