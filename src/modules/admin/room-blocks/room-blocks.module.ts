import { Module } from '@nestjs/common';
import { RoomBlocksService } from './room-blocks.service';
import { RoomBlocksController } from './room-blocks.controller';
import { roomBlocksProviders } from './room-blocks.provider';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [ActivityLogsModule],
  controllers: [RoomBlocksController],
  providers: [RoomBlocksService, ...roomBlocksProviders],
  exports: [RoomBlocksService],
})
export class RoomBlocksModule {}
