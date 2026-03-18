/**
 * ============================================
 * HOTEL REPOSITORY INTERFACE
 * ============================================
 *
 * Hotel-specific repository interface that extends base
 * repository with hotel-specific query methods.
 *
 * Services use ONLY this interface, never the implementation.
 * This allows switching database providers without changing services.
 */

import { IBaseRepository, FindOptions } from './base.repository.interface';

/**
 * Hotel entity type (provider-agnostic)
 */
export interface HotelEntity {
  id?: number;
  uuid: string;
  name: string;
  slug: string;
  description?: string | null;
  address: string;
  city: string;
  state?: string | null;
  country: string;
  postal_code?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  star_rating?: number | null;
  check_in_time: string;
  check_out_time: string;
  latitude?: number | null;
  longitude?: number | null;
  image_url?: string | null;
  amenities?: string[] | null;
  gallery_images?: string[] | null;
  is_active: boolean;
  created_by?: number | null; // Admin who created the hotel
  created_at?: Date | null;
  updated_at?: Date | null;
  room_types?: RoomTypeEntity[];
  hasWeddingGroups?: boolean; // True if hotel has linked wedding groups (cannot be deleted)
}

/**
 * Room type entity (for relations)
 */
export interface RoomTypeEntity {
  uuid: string;
  name: string;
  slug: string;
  description?: string | null;
  bed_type?: string | null;
  room_size?: number | null;
  max_adults?: number | null;
  max_children?: number | null;
  max_occupancy?: number | null;
  base_price?: number | null;
  amenities?: string[] | null;
  image_url?: string | null;
  sort_order?: number | null;
  is_active: boolean;
  created_at?: Date | null;
}

/**
 * Create hotel DTO (provider-agnostic)
 */
export interface CreateHotelData {
  uuid: string;
  name: string;
  slug: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  star_rating?: number;
  check_in_time?: string;
  check_out_time?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  image_url?: string;
  amenities?: string[];
  gallery_images?: string[];
  is_active?: boolean;
  created_by?: number; // Admin who created the hotel
}

/**
 * Update hotel DTO (provider-agnostic)
 */
export interface UpdateHotelData {
  name?: string;
  slug?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  star_rating?: number;
  check_in_time?: string;
  check_out_time?: string;
  latitude?: number;
  longitude?: number;
  image_url?: string;
  amenities?: string[];
  gallery_images?: string[];
  is_active?: boolean;
}

/**
 * Hotel query parameters
 */
export interface HotelQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  country?: string;
  city?: string;
  star_rating?: number;
  is_active?: boolean;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
  filterAdminId?: number | null; // Current admin ID for filtering (null = no filter/full access)
  fullAccessAdminIds?: number[]; // Admin IDs with full access (Super Admin/Developer) - their data is shared
}

/**
 * Hotel repository interface
 * Extends base repository with hotel-specific methods
 */
export interface IHotelRepository
  extends IBaseRepository<HotelEntity, CreateHotelData, UpdateHotelData> {
  /**
   * Find hotel by slug
   */
  findBySlug(slug: string): Promise<HotelEntity | null>;

  /**
   * Check if slug exists (optionally excluding a uuid)
   */
  isSlugExists(slug: string, excludeUuid?: string): Promise<boolean>;

  /**
   * Get all hotels with pagination and filters
   */
  findAllWithFilters(
    query: HotelQueryParams,
  ): Promise<{ rows: HotelEntity[]; count: number }>;

  /**
   * Search hotels (public - only active)
   */
  search(searchQuery: string, limit?: number): Promise<HotelEntity[]>;

  /**
   * Change hotel active status
   */
  changeStatus(uuid: string, is_active: boolean): Promise<[number]>;

  /**
   * Get hotel with room types
   */
  findByUuidWithRoomTypes(uuid: string): Promise<HotelEntity | null>;

  /**
   * Get hotel by slug with room types
   */
  findBySlugWithRoomTypes(slug: string): Promise<HotelEntity | null>;
}

/**
 * Repository token for dependency injection
 */
export const HOTEL_REPOSITORY = 'HOTEL_REPOSITORY';
