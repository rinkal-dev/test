import { Module } from '@nestjs/common';
import { ExternalApiController } from './external-api.controller';
import { ExternalApiService } from './external-api.service';
import { ApiKeysModule } from '../admin/api-keys/api-keys.module';
import { PaymentRemindersModule } from '../scheduled-tasks/payment-reminders/payment-reminders.module';
import {
  BOOKINGS_REPOSITORY,
  WEDDING_GROUPS_REPOSITORY,
  GUESTS_REPOSITORY,
  GROUP_ROOM_BLOCKS_REPOSITORY,
} from 'src/config/constants';
import {
  Bookings,
  WeddingGroups,
  Guests,
  GroupRoomBlocks,
} from 'src/models';

const externalApiProviders = [
  {
    provide: BOOKINGS_REPOSITORY,
    useValue: Bookings,
  },
  {
    provide: WEDDING_GROUPS_REPOSITORY,
    useValue: WeddingGroups,
  },
  {
    provide: GUESTS_REPOSITORY,
    useValue: Guests,
  },
  {
    provide: GROUP_ROOM_BLOCKS_REPOSITORY,
    useValue: GroupRoomBlocks,
  },
];

@Module({
  imports: [ApiKeysModule, PaymentRemindersModule],
  controllers: [ExternalApiController],
  providers: [ExternalApiService, ...externalApiProviders],
  exports: [ExternalApiService],
})
export class ExternalApiModule {}
