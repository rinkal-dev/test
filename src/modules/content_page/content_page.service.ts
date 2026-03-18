import { Inject, Injectable } from '@nestjs/common';
import { CONTENT_PAGES_REPOSITORY } from 'src/config/constants';
import { ContentPages } from 'src/models';

@Injectable()
export class ContentPageService {
  constructor(
    @Inject(CONTENT_PAGES_REPOSITORY)
    private contentPagesRepository: typeof ContentPages,
  ) {}

  async getPageContent(slug: string) {
    return this.contentPagesRepository.findOne({
      attributes: ['content'],
      where: { slug: slug },
      raw: true,
    });
  }
}
