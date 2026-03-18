/**
 * ============================================
 * CONTENT PAGE REPOSITORY INTERFACE
 * ============================================
 */

import { IBaseRepository } from './base.repository.interface';

export interface ContentPageEntity {
  id?: number;
  uuid?: string;
  title: string;
  slug: string;
  content?: string | null;
  is_active: boolean;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export interface CreateContentPageData {
  uuid?: string;
  title: string;
  slug: string;
  content?: string;
  is_active?: boolean;
}

export interface UpdateContentPageData {
  title?: string;
  slug?: string;
  content?: string;
  is_active?: boolean;
}

export interface ContentPageQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface IContentPageRepository
  extends IBaseRepository<ContentPageEntity, CreateContentPageData, UpdateContentPageData> {
  findBySlug(slug: string): Promise<ContentPageEntity | null>;
  isSlugExists(slug: string, excludeId?: number): Promise<boolean>;
  findAllWithFilters(query: ContentPageQueryParams): Promise<{ rows: ContentPageEntity[]; count: number }>;
  changeStatus(id: number, is_active: boolean): Promise<[number]>;
}

export const CONTENT_PAGE_REPOSITORY = 'CONTENT_PAGE_REPOSITORY';
