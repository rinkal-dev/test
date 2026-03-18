import { Module } from '@nestjs/common';
import { StatesController } from './states.controller';
import { StatesService } from './states.service';
import { statesProviders } from './states.provider';

@Module({
  imports: [],
  controllers: [StatesController],
  providers: [StatesService, ...statesProviders],
})
export class StatesModule {}
