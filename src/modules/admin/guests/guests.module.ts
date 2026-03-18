import { Module } from '@nestjs/common';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { GuestInvitationEmailService } from './guest-invitation-email.service';
import { GuestBroadcastService } from './guest-broadcast.service';
import {
  GuestsRepositoryProvider,
  GuestsModelProvider,
} from '../../../core/repositories/guests.repository.provider';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [AdminAuthModule, ActivityLogsModule],
  controllers: [GuestsController],
  providers: [
    GuestsModelProvider,
    GuestsRepositoryProvider,
    GuestsService,
    GuestInvitationEmailService,
    GuestBroadcastService,
  ],
  exports: [GuestsService, GuestInvitationEmailService, GuestBroadcastService],
})
export class GuestsModule {}
