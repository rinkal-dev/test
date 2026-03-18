import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { CURRENCIES_REPOSITORY } from 'src/config/constants';
import { Currencies } from 'src/models';
import { CreateCurrencyDto } from './dto/CreateCurrencyDto';
import { UpdateCurrencyDto } from './dto/UpdateCurrencyDto';

interface CurrencyQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: string;
}

@Injectable()
export class CurrenciesService {
  constructor(
    @Inject(CURRENCIES_REPOSITORY)
    private currenciesRepository: typeof Currencies,
  ) {}

  // Get All Currencies
  async getAllCurrencies(queries: CurrencyQueryParams) {
    const page = Number(queries.page) || 1;
    const limit = Number(queries.limit) || 10;
    const offset = (page - 1) * limit;

    const where: any = {};

    if (queries.search) {
      where[Op.or] = [
        { code: { [Op.iLike]: `%${queries.search}%` } },
        { name: { [Op.iLike]: `%${queries.search}%` } },
        { symbol: { [Op.iLike]: `%${queries.search}%` } },
      ];
    }

    if (queries.is_active !== undefined) {
      where.is_active = queries.is_active === 'true';
    }

    return await this.currenciesRepository.findAndCountAll({
      where,
      attributes: [
        'id',
        'uuid',
        'code',
        'name',
        'symbol',
        'exchange_rate',
        'decimal_places',
        'is_default',
        'is_active',
        'stripe_supported',
        'exchange_rate_updated_at',
        'created_at',
      ],
      order: [
        ['is_default', 'DESC'],
        ['code', 'ASC'],
      ],
      offset,
      limit,
    });
  }

  // Get Active Currencies (for dropdowns)
  async getActiveCurrencies() {
    return await this.currenciesRepository.findAll({
      where: { is_active: true },
      attributes: ['uuid', 'code', 'name', 'symbol', 'exchange_rate', 'decimal_places', 'is_default'],
      order: [
        ['is_default', 'DESC'],
        ['code', 'ASC'],
      ],
    });
  }

  // Get Currency by UUID
  async getCurrencyByUuid(uuid: string) {
    const currency = await this.currenciesRepository.findOne({
      where: { uuid },
    });

    if (!currency) {
      throw new NotFoundException('Currency not found');
    }

    return currency;
  }

  // Get Default Currency
  async getDefaultCurrency() {
    const currency = await this.currenciesRepository.findOne({
      where: { is_default: true },
    });

    if (!currency) {
      // Return USD as fallback
      return await this.currenciesRepository.findOne({
        where: { code: 'USD' },
      });
    }

    return currency;
  }

  // Create Currency
  async createCurrency(createDto: CreateCurrencyDto) {
    // Check if code already exists
    const existing = await this.currenciesRepository.findOne({
      where: { code: createDto.code.toUpperCase() },
    });

    if (existing) {
      throw new ConflictException(`Currency with code ${createDto.code} already exists`);
    }

    // If setting as default, remove default from others
    if (createDto.is_default) {
      await this.currenciesRepository.update(
        { is_default: false },
        { where: { is_default: true } },
      );
    }

    return await this.currenciesRepository.create({
      uuid: uuidv4(),
      code: createDto.code.toUpperCase(),
      name: createDto.name,
      symbol: createDto.symbol,
      exchange_rate: createDto.exchange_rate || 1.0,
      decimal_places: createDto.decimal_places ?? 2,
      is_default: createDto.is_default || false,
      is_active: createDto.is_active ?? true,
      stripe_supported: createDto.stripe_supported ?? true,
      exchange_rate_updated_at: new Date(),
    });
  }

  // Update Currency
  async updateCurrency(uuid: string, updateDto: UpdateCurrencyDto) {
    const currency = await this.getCurrencyByUuid(uuid);

    // Check if code already exists (if changing)
    if (updateDto.code && updateDto.code.toUpperCase() !== currency.code) {
      const existing = await this.currenciesRepository.findOne({
        where: { code: updateDto.code.toUpperCase() },
      });
      if (existing) {
        throw new ConflictException(`Currency with code ${updateDto.code} already exists`);
      }
    }

    // If setting as default, remove default from others
    if (updateDto.is_default) {
      await this.currenciesRepository.update(
        { is_default: false },
        { where: { is_default: true, uuid: { [Op.ne]: uuid } } },
      );
    }

    const updateData: any = { ...updateDto };
    if (updateDto.code) {
      updateData.code = updateDto.code.toUpperCase();
    }
    if (updateDto.exchange_rate !== undefined) {
      updateData.exchange_rate_updated_at = new Date();
    }

    await this.currenciesRepository.update(updateData, { where: { uuid } });

    return await this.getCurrencyByUuid(uuid);
  }

  // Delete Currency
  async deleteCurrency(uuid: string) {
    const currency = await this.getCurrencyByUuid(uuid);

    if (currency.is_default) {
      throw new ConflictException('Cannot delete the default currency');
    }

    await this.currenciesRepository.destroy({ where: { uuid } });

    return { message: 'Currency deleted successfully' };
  }

  // Toggle Currency Status
  async toggleStatus(uuid: string, is_active: boolean) {
    const currency = await this.getCurrencyByUuid(uuid);

    if (currency.is_default && !is_active) {
      throw new ConflictException('Cannot deactivate the default currency');
    }

    await this.currenciesRepository.update({ is_active }, { where: { uuid } });

    return await this.getCurrencyByUuid(uuid);
  }

  // Set Default Currency
  async setDefaultCurrency(uuid: string) {
    const currency = await this.getCurrencyByUuid(uuid);

    if (!currency.is_active) {
      throw new ConflictException('Cannot set an inactive currency as default');
    }

    // Remove default from all
    await this.currenciesRepository.update(
      { is_default: false },
      { where: { is_default: true } },
    );

    // Set new default
    await this.currenciesRepository.update({ is_default: true }, { where: { uuid } });

    return await this.getCurrencyByUuid(uuid);
  }

  // Update Exchange Rate
  async updateExchangeRate(uuid: string, exchange_rate: number) {
    await this.getCurrencyByUuid(uuid);

    await this.currenciesRepository.update(
      {
        exchange_rate,
        exchange_rate_updated_at: new Date(),
      },
      { where: { uuid } },
    );

    return await this.getCurrencyByUuid(uuid);
  }

  // Convert Amount between currencies
  async convertAmount(
    amount: number,
    fromCurrencyCode: string,
    toCurrencyCode: string,
  ): Promise<{ amount: number; rate: number }> {
    if (fromCurrencyCode === toCurrencyCode) {
      return { amount, rate: 1 };
    }

    const fromCurrency = await this.currenciesRepository.findOne({
      where: { code: fromCurrencyCode.toUpperCase() },
    });

    const toCurrency = await this.currenciesRepository.findOne({
      where: { code: toCurrencyCode.toUpperCase() },
    });

    if (!fromCurrency || !toCurrency) {
      throw new NotFoundException('Currency not found');
    }

    // Convert: (amount / from_rate) * to_rate
    const rate = Number(toCurrency.exchange_rate) / Number(fromCurrency.exchange_rate);
    const convertedAmount = amount * rate;

    return {
      amount: Math.round(convertedAmount * Math.pow(10, toCurrency.decimal_places)) / Math.pow(10, toCurrency.decimal_places),
      rate,
    };
  }
}
