import { Module } from '@nestjs/common';
import { WeddingGroupsService } from './wedding-groups.service';
import { WeddingGroupsController } from './wedding-groups.controller';
import { weddingGroupsProviders } from './wedding-groups.provider';
import { EventsModule } from '../../events/events.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [EventsModule, ActivityLogsModule],
  controllers: [WeddingGroupsController],
  providers: [WeddingGroupsService, ...weddingGroupsProviders],
  exports: [WeddingGroupsService, ...weddingGroupsProviders],
})
export class WeddingGroupsModule {}
