import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateContentPage } from './dto/CreateContentPage';
import { offsetCount } from 'src/helpers/general';
import { CONTENT_PAGES_REPOSITORY } from 'src/config/constants';
import { ContentPages } from 'src/models';
import { Op } from 'sequelize';
import { ContentPagesQueries } from 'src/swagger/schema/ContentPagesQueries';

@Injectable()
export class ContentPagesService {
  constructor(
    @Inject(CONTENT_PAGES_REPOSITORY)
    private contentPagesRepository: typeof ContentPages,
  ) {}

  // Check Slug is exist or not.
  async checkSlug(slug: string) {
    return await this.contentPagesRepository.count({ where: { slug: slug } });
  }

  // Create Content page.
  async createContentPage(contentPage: CreateContentPage) {
    return await this.contentPagesRepository.create({
      uuid: uuidv4(),
      title: contentPage.title,
      slug: contentPage.slug,
      content: contentPage.content,
    });
  }

  // Get All Content pages.
  async getAllContentPages(queries: ContentPagesQueries) {
    const pageData = offsetCount(Number(queries.page), Number(queries.limit));

    let where = {};
    if (queries.search) {
      where = {
        [Op.or]: [
          { title: { [Op.like]: `%${queries.search}%` } },
          { slug: { [Op.like]: `%${queries.search}%` } },
        ],
      };
    }

    // Convert sort direction: -1/DESC -> DESC, 1/ASC -> ASC
    const sortDirection = queries.sort === '-1' || queries.sort === 'DESC' ? 'DESC' : 'ASC';

    return await this.contentPagesRepository.findAndCountAll({
      where: where,
      attributes: ['id', 'uuid', 'title', 'slug', 'is_active', 'updated_at'],
      order: [[queries.field, sortDirection]],
      offset: pageData.offset,
      limit: pageData.limit,
    });
  }

  // Get content page details.
  async getContentPageDetails(uuid: string) {
    try {
      return await this.contentPagesRepository.findOne({
        where: { uuid: uuid },
        attributes: [
          'id',
          'uuid',
          'title',
          'slug',
          'content',
          'created_at',
          'updated_at',
        ],
      });
    } catch (error) {
      return null;
    }
  }

  // Update content page.
  async update(uuid: string, contentPage: CreateContentPage) {
    try {
      return await this.contentPagesRepository.update(
        {
          title: contentPage.title,
          slug: contentPage.slug,
          content: contentPage.content,
          updated_at: new Date(),
        },
        { where: { uuid: uuid } },
      );
    } catch (error) {
      return [0];
    }
  }

  // Change Content page status.
  async changeStatus(uuid: string, status: boolean) {
    try {
      return await this.contentPagesRepository.update(
        { is_active: status, updated_at: new Date() },
        { where: { uuid: uuid } },
      );
    } catch (error) {
      return [0];
    }
  }
}
