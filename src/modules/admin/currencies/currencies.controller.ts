import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto } from './dto/CreateCurrencyDto';
import { UpdateCurrencyDto } from './dto/UpdateCurrencyDto';

@ApiTags('Admin - Currencies')
@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@Controller({ version: '1', path: 'admin/currencies' })
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all currencies with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'is_active', required: false, type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of currencies' })
  async getAllCurrencies(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('is_active') is_active?: string,
  ) {
    const result = await this.currenciesService.getAllCurrencies({
      page,
      limit,
      search,
      is_active,
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'Currencies fetched successfully',
      data: {
        currencies: result.rows,
        total: result.count,
        page: Number(page) || 1,
        limit: Number(limit) || 10,
      },
    };
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active currencies for dropdowns' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of active currencies' })
  async getActiveCurrencies() {
    const currencies = await this.currenciesService.getActiveCurrencies();
    return {
      statusCode: HttpStatus.OK,
      message: 'Active currencies fetched successfully',
      data: currencies,
    };
  }

  @Get('default')
  @ApiOperation({ summary: 'Get default currency' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Default currency' })
  async getDefaultCurrency() {
    const currency = await this.currenciesService.getDefaultCurrency();
    return {
      statusCode: HttpStatus.OK,
      message: 'Default currency fetched successfully',
      data: currency,
    };
  }

  @Get('convert')
  @ApiOperation({ summary: 'Convert amount between currencies' })
  @ApiQuery({ name: 'amount', required: true, type: Number })
  @ApiQuery({ name: 'from', required: true, type: String, description: 'From currency code' })
  @ApiQuery({ name: 'to', required: true, type: String, description: 'To currency code' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Converted amount' })
  async convertAmount(
    @Query('amount') amount: number,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const result = await this.currenciesService.convertAmount(
      Number(amount),
      from,
      to,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Amount converted successfully',
      data: {
        original_amount: Number(amount),
        from_currency: from.toUpperCase(),
        to_currency: to.toUpperCase(),
        converted_amount: result.amount,
        exchange_rate: result.rate,
      },
    };
  }

  @Get(':uuid')
  @ApiOperation({ summary: 'Get currency by UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Currency details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Currency not found' })
  async getCurrency(@Param('uuid') uuid: string) {
    const currency = await this.currenciesService.getCurrencyByUuid(uuid);
    return {
      statusCode: HttpStatus.OK,
      message: 'Currency fetched successfully',
      data: currency,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new currency' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Currency created' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Currency code already exists' })
  async createCurrency(@Body() createDto: CreateCurrencyDto) {
    const currency = await this.currenciesService.createCurrency(createDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Currency created successfully',
      data: currency,
    };
  }

  @Patch(':uuid')
  @ApiOperation({ summary: 'Update a currency' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Currency updated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Currency not found' })
  async updateCurrency(
    @Param('uuid') uuid: string,
    @Body() updateDto: UpdateCurrencyDto,
  ) {
    const currency = await this.currenciesService.updateCurrency(uuid, updateDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Currency updated successfully',
      data: currency,
    };
  }

  @Delete(':uuid')
  @ApiOperation({ summary: 'Delete a currency' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Currency deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Currency not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Cannot delete default currency' })
  async deleteCurrency(@Param('uuid') uuid: string) {
    const result = await this.currenciesService.deleteCurrency(uuid);
    return {
      statusCode: HttpStatus.OK,
      message: result.message,
    };
  }

  @Patch(':uuid/status')
  @ApiOperation({ summary: 'Toggle currency active status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Status updated' })
  async toggleStatus(
    @Param('uuid') uuid: string,
    @Body('is_active') is_active: boolean,
  ) {
    const currency = await this.currenciesService.toggleStatus(uuid, is_active);
    return {
      statusCode: HttpStatus.OK,
      message: `Currency ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: currency,
    };
  }

  @Patch(':uuid/set-default')
  @ApiOperation({ summary: 'Set currency as default' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Default currency updated' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Cannot set inactive currency as default' })
  async setDefaultCurrency(@Param('uuid') uuid: string) {
    const currency = await this.currenciesService.setDefaultCurrency(uuid);
    return {
      statusCode: HttpStatus.OK,
      message: 'Default currency updated successfully',
      data: currency,
    };
  }

  @Patch(':uuid/exchange-rate')
  @ApiOperation({ summary: 'Update currency exchange rate' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Exchange rate updated' })
  async updateExchangeRate(
    @Param('uuid') uuid: string,
    @Body('exchange_rate') exchange_rate: number,
  ) {
    const currency = await this.currenciesService.updateExchangeRate(uuid, exchange_rate);
    return {
      statusCode: HttpStatus.OK,
      message: 'Exchange rate updated successfully',
      data: currency,
    };
  }
}
