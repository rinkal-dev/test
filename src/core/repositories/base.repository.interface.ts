/**
 * ============================================
 * BASE REPOSITORY INTERFACE
 * ============================================
 *
 * Generic repository interface that defines standard
 * database operations. All entity repositories should
 * extend this interface.
 *
 * This abstraction allows switching between:
 * - Sequelize (current)
 * - Supabase (future)
 * - Any other database provider
 *
 * WITHOUT changing service layer code.
 */

export interface FindOptions {
  where?: Record<string, any>;
  attributes?: string[];
  include?: IncludeOptions[];
  order?: [string, 'ASC' | 'DESC'][];
  offset?: number;
  limit?: number;
  raw?: boolean;
}

export interface IncludeOptions {
  model: string;
  attributes?: string[];
  as?: string;
  required?: boolean;
}

export interface CountOptions {
  where?: Record<string, any>;
}

export interface FindAndCountResult<T> {
  rows: T[];
  count: number;
}

export interface IBaseRepository<T, CreateDto, UpdateDto> {
  /**
   * Create a new entity
   */
  create(data: CreateDto): Promise<T>;

  /**
   * Find all entities with optional filtering
   */
  findAll(options?: FindOptions): Promise<T[]>;

  /**
   * Find all entities with count (for pagination)
   */
  findAndCountAll(options?: FindOptions): Promise<FindAndCountResult<T>>;

  /**
   * Find one entity by conditions
   */
  findOne(options: FindOptions): Promise<T | null>;

  /**
   * Find entity by primary key (uuid)
   */
  findByUuid(uuid: string, options?: FindOptions): Promise<T | null>;

  /**
   * Update entity by uuid
   * Returns [affectedCount]
   */
  update(uuid: string, data: UpdateDto): Promise<[number]>;

  /**
   * Delete entity by uuid
   * Returns affected count
   */
  delete(uuid: string): Promise<number>;

  /**
   * Count entities matching conditions
   */
  count(options?: CountOptions): Promise<number>;

  /**
   * Check if entity exists
   */
  exists(uuid: string): Promise<boolean>;
}
