/**
 * ============================================
 * SEQUELIZE LOCATION REPOSITORIES
 * Countries, States, Cities
 * ============================================
 */

import { Injectable, Inject } from '@nestjs/common';
import { Op } from 'sequelize';
import { COUNTRIES_REPOSITORY, STATES_REPOSITORY, CITIES_REPOSITORY } from '../../../config/constants';
import { Countries } from '../../../models/Countries';
import { States } from '../../../models/States';
import { Cities } from '../../../models/Cities';
import { FindOptions, CountOptions, FindAndCountResult } from '../base.repository.interface';
import {
  ICountryRepository, CountryEntity, CreateCountryData, UpdateCountryData, CountryQueryParams,
  IStateRepository, StateEntity, CreateStateData, UpdateStateData, StateQueryParams,
  ICityRepository, CityEntity, CreateCityData, UpdateCityData, CityQueryParams,
} from '../location.repository.interface';

// ============================================
// COUNTRY REPOSITORY
// ============================================
@Injectable()
export class SequelizeCountryRepository implements ICountryRepository {
  constructor(@Inject(COUNTRIES_REPOSITORY) private countriesModel: typeof Countries) {}

  private toEntity(model: Countries | null): CountryEntity | null {
    if (!model) return null;
    return model.get({ plain: true }) as CountryEntity;
  }

  private toEntities(models: Countries[]): CountryEntity[] {
    return models.map((m) => this.toEntity(m) as CountryEntity);
  }

  async create(data: CreateCountryData): Promise<CountryEntity> {
    const model = await this.countriesModel.create(data as any);
    return this.toEntity(model) as CountryEntity;
  }

  async findAll(options?: FindOptions): Promise<CountryEntity[]> {
    const models = await this.countriesModel.findAll(options as any);
    return this.toEntities(models);
  }

  async findAndCountAll(options?: FindOptions): Promise<FindAndCountResult<CountryEntity>> {
    const result = await this.countriesModel.findAndCountAll(options as any);
    return { rows: this.toEntities(result.rows), count: result.count };
  }

  async findOne(options: FindOptions): Promise<CountryEntity | null> {
    const model = await this.countriesModel.findOne(options as any);
    return this.toEntity(model);
  }

  async findByUuid(uuid: string, options?: FindOptions): Promise<CountryEntity | null> {
    const model = await this.countriesModel.findOne({ where: { uuid }, ...options } as any);
    return this.toEntity(model);
  }

  async update(uuid: string, data: UpdateCountryData): Promise<[number]> {
    return await this.countriesModel.update({ ...data, updated_at: new Date() }, { where: { uuid } });
  }

  async delete(uuid: string): Promise<number> {
    return await this.countriesModel.destroy({ where: { uuid } });
  }

  async count(options?: CountOptions): Promise<number> {
    const result = await this.countriesModel.count(options as any);
    return typeof result === 'number' ? result : (result as any[]).length;
  }

  async exists(uuid: string): Promise<boolean> {
    return (await this.countriesModel.count({ where: { uuid } })) > 0;
  }

  async findAllWithFilters(query: CountryQueryParams): Promise<{ rows: CountryEntity[]; count: number }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    let where: any = {};
    if (query.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${query.search}%` } },
        { code: { [Op.like]: `%${query.search}%` } },
      ];
    }

    const result = await this.countriesModel.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      offset,
      limit,
    });

    return { rows: this.toEntities(result.rows), count: result.count };
  }

  async changeStatus(id: number, is_active: boolean): Promise<[number]> {
    return await this.countriesModel.update({ is_active, updated_at: new Date() }, { where: { id } });
  }
}

// ============================================
// STATE REPOSITORY
// ============================================
@Injectable()
export class SequelizeStateRepository implements IStateRepository {
  constructor(@Inject(STATES_REPOSITORY) private statesModel: typeof States) {}

  private toEntity(model: States | null): StateEntity | null {
    if (!model) return null;
    return model.get({ plain: true }) as StateEntity;
  }

  private toEntities(models: States[]): StateEntity[] {
    return models.map((m) => this.toEntity(m) as StateEntity);
  }

  async create(data: CreateStateData): Promise<StateEntity> {
    const model = await this.statesModel.create(data as any);
    return this.toEntity(model) as StateEntity;
  }

  async findAll(options?: FindOptions): Promise<StateEntity[]> {
    const models = await this.statesModel.findAll(options as any);
    return this.toEntities(models);
  }

  async findAndCountAll(options?: FindOptions): Promise<FindAndCountResult<StateEntity>> {
    const result = await this.statesModel.findAndCountAll(options as any);
    return { rows: this.toEntities(result.rows), count: result.count };
  }

  async findOne(options: FindOptions): Promise<StateEntity | null> {
    const model = await this.statesModel.findOne(options as any);
    return this.toEntity(model);
  }

  async findByUuid(uuid: string, options?: FindOptions): Promise<StateEntity | null> {
    const model = await this.statesModel.findOne({ where: { uuid }, ...options } as any);
    return this.toEntity(model);
  }

  async update(uuid: string, data: UpdateStateData): Promise<[number]> {
    return await this.statesModel.update({ ...data, updated_at: new Date() }, { where: { uuid } });
  }

  async delete(uuid: string): Promise<number> {
    return await this.statesModel.destroy({ where: { uuid } });
  }

  async count(options?: CountOptions): Promise<number> {
    const result = await this.statesModel.count(options as any);
    return typeof result === 'number' ? result : (result as any[]).length;
  }

  async exists(uuid: string): Promise<boolean> {
    return (await this.statesModel.count({ where: { uuid } })) > 0;
  }

  async findAllWithFilters(query: StateQueryParams): Promise<{ rows: StateEntity[]; count: number }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    let where: any = {};
    if (query.search) {
      where.name = { [Op.like]: `%${query.search}%` };
    }
    if (query.country_id) {
      where.country_id = query.country_id;
    }

    const result = await this.statesModel.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      offset,
      limit,
    });

    return { rows: this.toEntities(result.rows), count: result.count };
  }

  async findAllWithCountry(query: StateQueryParams): Promise<{ rows: StateEntity[]; count: number }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    let where: any = {};
    if (query.search) {
      where.name = { [Op.like]: `%${query.search}%` };
    }

    const result = await this.statesModel.findAndCountAll({
      where,
      include: [{ model: Countries, attributes: ['id', 'name', 'code'] }],
      order: [['name', 'ASC']],
      offset,
      limit,
    });

    return { rows: this.toEntities(result.rows), count: result.count };
  }

  async changeStatus(id: number, is_active: boolean): Promise<[number]> {
    return await this.statesModel.update({ is_active, updated_at: new Date() }, { where: { id } });
  }
}

// ============================================
// CITY REPOSITORY
// ============================================
@Injectable()
export class SequelizeCityRepository implements ICityRepository {
  constructor(@Inject(CITIES_REPOSITORY) private citiesModel: typeof Cities) {}

  private toEntity(model: Cities | null): CityEntity | null {
    if (!model) return null;
    return model.get({ plain: true }) as CityEntity;
  }

  private toEntities(models: Cities[]): CityEntity[] {
    return models.map((m) => this.toEntity(m) as CityEntity);
  }

  async create(data: CreateCityData): Promise<CityEntity> {
    const model = await this.citiesModel.create(data as any);
    return this.toEntity(model) as CityEntity;
  }

  async findAll(options?: FindOptions): Promise<CityEntity[]> {
    const models = await this.citiesModel.findAll(options as any);
    return this.toEntities(models);
  }

  async findAndCountAll(options?: FindOptions): Promise<FindAndCountResult<CityEntity>> {
    const result = await this.citiesModel.findAndCountAll(options as any);
    return { rows: this.toEntities(result.rows), count: result.count };
  }

  async findOne(options: FindOptions): Promise<CityEntity | null> {
    const model = await this.citiesModel.findOne(options as any);
    return this.toEntity(model);
  }

  async findByUuid(uuid: string, options?: FindOptions): Promise<CityEntity | null> {
    const model = await this.citiesModel.findOne({ where: { uuid }, ...options } as any);
    return this.toEntity(model);
  }

  async update(uuid: string, data: UpdateCityData): Promise<[number]> {
    return await this.citiesModel.update({ ...data, updated_at: new Date() }, { where: { uuid } });
  }

  async delete(uuid: string): Promise<number> {
    return await this.citiesModel.destroy({ where: { uuid } });
  }

  async count(options?: CountOptions): Promise<number> {
    const result = await this.citiesModel.count(options as any);
    return typeof result === 'number' ? result : (result as any[]).length;
  }

  async exists(uuid: string): Promise<boolean> {
    return (await this.citiesModel.count({ where: { uuid } })) > 0;
  }

  async findAllWithFilters(query: CityQueryParams): Promise<{ rows: CityEntity[]; count: number }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    let where: any = {};
    if (query.search) {
      where.name = { [Op.like]: `%${query.search}%` };
    }
    if (query.state_id) {
      where.state_id = query.state_id;
    }

    const result = await this.citiesModel.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      offset,
      limit,
    });

    return { rows: this.toEntities(result.rows), count: result.count };
  }

  async findAllWithStateAndCountry(query: CityQueryParams): Promise<{ rows: CityEntity[]; count: number }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    let where: any = {};
    if (query.search) {
      where.name = { [Op.like]: `%${query.search}%` };
    }

    const result = await this.citiesModel.findAndCountAll({
      where,
      include: [{
        model: States,
        attributes: ['id', 'name'],
        include: [{ model: Countries, attributes: ['id', 'name'] }],
      }],
      order: [['name', 'ASC']],
      offset,
      limit,
    });

    return { rows: this.toEntities(result.rows), count: result.count };
  }

  async changeStatus(id: number, is_active: boolean): Promise<[number]> {
    return await this.citiesModel.update({ is_active, updated_at: new Date() }, { where: { id } });
  }
}
