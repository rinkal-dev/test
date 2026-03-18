import { Module } from '@nestjs/common';
import { CitiesController } from './cities.controller';
import { CitiesService } from './cities.service';
import { citiesProviders } from './cities.provider';

@Module({
  imports: [],
  controllers: [CitiesController],
  providers: [CitiesService, ...citiesProviders],
})
export class CitiesModule {}
