import { Module } from '@nestjs/common';
import { GuestFlightsController } from './guest-flights.controller';
import { GuestFlightsService } from './guest-flights.service';
import { FlightChangeNotificationService } from './flight-change-notification.service';
import { guestFlightsProviders } from './guest-flights.provider';
import { GuestAuthModule } from '../guest-auth/guest-auth.module';

@Module({
  imports: [GuestAuthModule],
  controllers: [GuestFlightsController],
  providers: [
    GuestFlightsService,
    FlightChangeNotificationService,
    ...guestFlightsProviders,
  ],
  exports: [GuestFlightsService, FlightChangeNotificationService],
})
export class GuestFlightsModule {}
