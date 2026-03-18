/**
 * ============================================
 * SEQUELIZE CONTENT PAGE REPOSITORY
 * ============================================
 */

import { Injectable, Inject } from '@nestjs/common';
import { Op } from 'sequelize';
import { CONTENT_PAGES_REPOSITORY } from '../../../config/constants';
import { ContentPages } from '../../../models/ContentPages';
import { FindOptions, CountOptions, FindAndCountResult } from '../base.repository.interface';
import { IContentPageRepository, ContentPageEntity, CreateContentPageData, UpdateContentPageData, ContentPageQueryParams } from '../content-page.repository.interface';

@Injectable()
export class SequelizeContentPageRepository implements IContentPageRepository {
  constructor(@Inject(CONTENT_PAGES_REPOSITORY) private contentPagesModel: typeof ContentPages) {}

  private toEntity(model: ContentPages | null): ContentPageEntity | null {
    if (!model) return null;
    return model.get({ plain: true }) as ContentPageEntity;
  }

  private toEntities(models: ContentPages[]): ContentPageEntity[] {
    return models.map((m) => this.toEntity(m) as ContentPageEntity);
  }

  async create(data: CreateContentPageData): Promise<ContentPageEntity> {
    const model = await this.contentPagesModel.create(data as any);
    return this.toEntity(model) as ContentPageEntity;
  }

  async findAll(options?: FindOptions): Promise<ContentPageEntity[]> {
    const models = await this.contentPagesModel.findAll(options as any);
    return this.toEntities(models);
  }

  async findAndCountAll(options?: FindOptions): Promise<FindAndCountResult<ContentPageEntity>> {
    const result = await this.contentPagesModel.findAndCountAll(options as any);
    return { rows: this.toEntities(result.rows), count: result.count };
  }

  async findOne(options: FindOptions): Promise<ContentPageEntity | null> {
    const model = await this.contentPagesModel.findOne(options as any);
    return this.toEntity(model);
  }

  async findByUuid(uuid: string, options?: FindOptions): Promise<ContentPageEntity | null> {
    const model = await this.contentPagesModel.findOne({ where: { uuid }, ...options } as any);
    return this.toEntity(model);
  }

  async update(uuid: string, data: UpdateContentPageData): Promise<[number]> {
    return await this.contentPagesModel.update({ ...data, updated_at: new Date() }, { where: { uuid } });
  }

  async delete(uuid: string): Promise<number> {
    return await this.contentPagesModel.destroy({ where: { uuid } });
  }

  async count(options?: CountOptions): Promise<number> {
    const result = await this.contentPagesModel.count(options as any);
    return typeof result === 'number' ? result : (result as any[]).length;
  }

  async exists(uuid: string): Promise<boolean> {
    return (await this.contentPagesModel.count({ where: { uuid } })) > 0;
  }

  async findBySlug(slug: string): Promise<ContentPageEntity | null> {
    const model = await this.contentPagesModel.findOne({ where: { slug } });
    return this.toEntity(model);
  }

  async isSlugExists(slug: string, excludeId?: number): Promise<boolean> {
    const where: any = { slug };
    if (excludeId) where.id = { [Op.ne]: excludeId };
    return (await this.contentPagesModel.count({ where })) > 0;
  }

  async findAllWithFilters(query: ContentPageQueryParams): Promise<{ rows: ContentPageEntity[]; count: number }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    let where: any = {};
    if (query.search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${query.search}%` } },
        { slug: { [Op.like]: `%${query.search}%` } },
      ];
    }

    const result = await this.contentPagesModel.findAndCountAll({
      where,
      order: [['id', 'DESC']],
      offset,
      limit,
    });

    return { rows: this.toEntities(result.rows), count: result.count };
  }

  async changeStatus(id: number, is_active: boolean): Promise<[number]> {
    return await this.contentPagesModel.update({ is_active, updated_at: new Date() }, { where: { id } });
  }
}
