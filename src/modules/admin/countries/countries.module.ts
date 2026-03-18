import { Module } from '@nestjs/common';
import { CountriesController } from './countries.controller';
import { CountriesService } from './countries.service';
import { countriesProviders } from './countries.provider';

@Module({
  imports: [],
  controllers: [CountriesController],
  providers: [CountriesService, ...countriesProviders],
})
export class CountriesModule {}
