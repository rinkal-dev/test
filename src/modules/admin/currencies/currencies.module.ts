import { Module } from '@nestjs/common';
import { CurrenciesController } from './currencies.controller';
import { CurrenciesService } from './currencies.service';
import { currenciesProviders } from './currencies.provider';

@Module({
  imports: [],
  controllers: [CurrenciesController],
  providers: [CurrenciesService, ...currenciesProviders],
  exports: [CurrenciesService],
})
export class CurrenciesModule {}
