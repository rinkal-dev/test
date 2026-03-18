import { Module } from '@nestjs/common';
import { GroupItineraryService } from './group-itinerary.service';
import { GroupItineraryController } from './group-itinerary.controller';
import { groupItineraryProviders } from './group-itinerary.provider';

@Module({
  controllers: [GroupItineraryController],
  providers: [GroupItineraryService, ...groupItineraryProviders],
  exports: [GroupItineraryService],
})
export class GroupItineraryModule {}
