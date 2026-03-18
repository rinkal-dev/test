import { Module } from '@nestjs/common';
import { RoomTypesController } from './room-types.controller';
import { RoomTypesService } from './room-types.service';
import { roomTypesProviders } from './room-types.provider';
import { HOTELS_REPOSITORY, BOOKING_ROOMS_REPOSITORY } from 'src/config/constants';
import { Hotels } from 'src/models/Hotels';
import { BookingRooms } from 'src/models/BookingRooms';

@Module({
  controllers: [RoomTypesController],
  providers: [
    RoomTypesService,
    ...roomTypesProviders,
    {
      provide: HOTELS_REPOSITORY,
      useValue: Hotels,
    },
    {
      provide: BOOKING_ROOMS_REPOSITORY,
      useValue: BookingRooms,
    },
  ],
  exports: [RoomTypesService],
})
export class RoomTypesModule {}
