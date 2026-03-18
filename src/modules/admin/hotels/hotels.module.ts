import { Module } from '@nestjs/common';
import { HotelsService } from './hotels.service';
import { HotelsController } from './hotels.controller';
import { hotelsProviders } from './hotels.provider';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [ActivityLogsModule],
  controllers: [HotelsController],
  providers: [HotelsService, ...hotelsProviders],
  exports: [HotelsService, ...hotelsProviders],
})
export class HotelsModule {}
