import { Module } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLogsController } from './activity-logs.controller';
import { activityLogsProviders } from './activity-logs.provider';

@Module({
  controllers: [ActivityLogsController],
  providers: [ActivityLogsService, ...activityLogsProviders],
  exports: [ActivityLogsService],
})
export class ActivityLogsModule {}
