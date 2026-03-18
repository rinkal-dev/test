import { Module } from '@nestjs/common';
import { GroupAddonsService } from './group-addons.service';
import { GroupAddonsController } from './group-addons.controller';
import { groupAddonsProviders } from './group-addons.provider';

@Module({
  controllers: [GroupAddonsController],
  providers: [GroupAddonsService, ...groupAddonsProviders],
  exports: [GroupAddonsService],
})
export class GroupAddonsModule {}
