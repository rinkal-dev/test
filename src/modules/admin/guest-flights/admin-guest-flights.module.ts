import { Module } from '@nestjs/common';
import { AdminGuestFlightsController } from './admin-guest-flights.controller';
import { AdminGuestFlightsService } from './admin-guest-flights.service';
import { adminGuestFlightsProviders } from './admin-guest-flights.provider';

@Module({
  controllers: [AdminGuestFlightsController],
  providers: [AdminGuestFlightsService, ...adminGuestFlightsProviders],
  exports: [AdminGuestFlightsService],
})
export class AdminGuestFlightsModule {}
