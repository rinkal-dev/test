import { Inject, Injectable } from '@nestjs/common';
import { Seeder } from 'nestjs-seeder';
import { v4 as uuidv4 } from 'uuid';
import { CURRENCIES_REPOSITORY } from 'src/config/constants';
import { Currencies } from 'src/models';

@Injectable()
export class CurrenciesSeeder implements Seeder {
  constructor(
    @Inject(CURRENCIES_REPOSITORY)
    private currenciesRepository: typeof Currencies,
  ) {}

  seed = async (): Promise<any> => {
    const now = new Date();

    // Currency data - USD and CAD are active, others are future-ready (inactive)
    const currencies = [
      // Active currencies (V1)
      {
        uuid: uuidv4(),
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        decimal_places: 2,
        is_default: true,
        is_active: true,
        stripe_supported: true,
        exchange_rate: 1.0,
        created_at: now,
      },
      {
        uuid: uuidv4(),
        code: 'CAD',
        name: 'Canadian Dollar',
        symbol: 'CA$',
        decimal_places: 2,
        is_default: false,
        is_active: true,
        stripe_supported: true,
        exchange_rate: 1.0,
        created_at: now,
      },
      // Future-ready currencies (inactive - can be enabled later)
      {
        uuid: uuidv4(),
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        decimal_places: 2,
        is_default: false,
        is_active: false,
        stripe_supported: true,
        exchange_rate: 1.0,
        created_at: now,
      },
      {
        uuid: uuidv4(),
        code: 'GBP',
        name: 'British Pound',
        symbol: '£',
        decimal_places: 2,
        is_default: false,
        is_active: false,
        stripe_supported: true,
        exchange_rate: 1.0,
        created_at: now,
      },
      {
        uuid: uuidv4(),
        code: 'MXN',
        name: 'Mexican Peso',
        symbol: 'MX$',
        decimal_places: 2,
        is_default: false,
        is_active: false,
        stripe_supported: true,
        exchange_rate: 1.0,
        created_at: now,
      },
      {
        uuid: uuidv4(),
        code: 'AUD',
        name: 'Australian Dollar',
        symbol: 'A$',
        decimal_places: 2,
        is_default: false,
        is_active: false,
        stripe_supported: true,
        exchange_rate: 1.0,
        created_at: now,
      },
    ];

    // Use ignoreDuplicates to avoid errors if currencies already exist
    const result = await this.currenciesRepository.bulkCreate(currencies, {
      ignoreDuplicates: true,
    });

    console.log(`Currencies seeded: ${result.length} currencies`);
    console.log('Active currencies: USD, CAD');
    console.log('Future-ready (inactive): EUR, GBP, MXN, AUD');

    return result;
  };

  drop = async (): Promise<any> => {
    return this.currenciesRepository.destroy({ where: {} });
  };
}
