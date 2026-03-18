/**
 * ============================================
 * LOCATION REPOSITORIES INTERFACE
 * Countries, States, Cities
 * ============================================
 */

import { IBaseRepository } from './base.repository.interface';

// ============================================
// COUNTRY
// ============================================
export interface CountryEntity {
  id?: number;
  uuid?: string;
  name: string;
  code?: string;
  phone_code?: string;
  is_active: boolean;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export interface CreateCountryData {
  uuid?: string;
  name: string;
  code?: string;
  phone_code?: string;
  is_active?: boolean;
}

export interface UpdateCountryData {
  name?: string;
  code?: string;
  phone_code?: string;
  is_active?: boolean;
}

export interface CountryQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ICountryRepository
  extends IBaseRepository<CountryEntity, CreateCountryData, UpdateCountryData> {
  findAllWithFilters(query: CountryQueryParams): Promise<{ rows: CountryEntity[]; count: number }>;
  changeStatus(id: number, is_active: boolean): Promise<[number]>;
}

export const COUNTRY_REPOSITORY = 'COUNTRY_REPOSITORY';

// ============================================
// STATE
// ============================================
export interface StateEntity {
  id?: number;
  uuid?: string;
  name: string;
  country_id: number;
  is_active: boolean;
  created_at?: Date | null;
  updated_at?: Date | null;
  country?: CountryEntity;
}

export interface CreateStateData {
  uuid?: string;
  name: string;
  country_id: number;
  is_active?: boolean;
}

export interface UpdateStateData {
  name?: string;
  country_id?: number;
  is_active?: boolean;
}

export interface StateQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  country_id?: number;
}

export interface IStateRepository
  extends IBaseRepository<StateEntity, CreateStateData, UpdateStateData> {
  findAllWithFilters(query: StateQueryParams): Promise<{ rows: StateEntity[]; count: number }>;
  findAllWithCountry(query: StateQueryParams): Promise<{ rows: StateEntity[]; count: number }>;
  changeStatus(id: number, is_active: boolean): Promise<[number]>;
}

export const STATE_REPOSITORY = 'STATE_REPOSITORY';

// ============================================
// CITY
// ============================================
export interface CityEntity {
  id?: number;
  uuid?: string;
  name: string;
  state_id: number;
  is_active: boolean;
  created_at?: Date | null;
  updated_at?: Date | null;
  state?: StateEntity;
}

export interface CreateCityData {
  uuid?: string;
  name: string;
  state_id: number;
  is_active?: boolean;
}

export interface UpdateCityData {
  name?: string;
  state_id?: number;
  is_active?: boolean;
}

export interface CityQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  state_id?: number;
}

export interface ICityRepository
  extends IBaseRepository<CityEntity, CreateCityData, UpdateCityData> {
  findAllWithFilters(query: CityQueryParams): Promise<{ rows: CityEntity[]; count: number }>;
  findAllWithStateAndCountry(query: CityQueryParams): Promise<{ rows: CityEntity[]; count: number }>;
  changeStatus(id: number, is_active: boolean): Promise<[number]>;
}

export const CITY_REPOSITORY = 'CITY_REPOSITORY';
