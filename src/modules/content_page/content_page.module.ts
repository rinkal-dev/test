import { Module } from '@nestjs/common';
import { ContentPageController } from './content_page.controller';
import { ContentPageService } from './content_page.service';
import { contentPagesProviders } from '../admin/content-pages/content-pages.provider';

@Module({
  imports: [],
  controllers: [ContentPageController],
  providers: [ContentPageService, ...contentPagesProviders],
})
export class ContentPageModule {}
