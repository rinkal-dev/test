import { Module } from '@nestjs/common';
import { ContentPagesController } from './content-pages.controller';
import { ContentPagesService } from './content-pages.service';
import { contentPagesProviders } from './content-pages.provider';

@Module({
  imports: [],
  controllers: [ContentPagesController],
  providers: [ContentPagesService, ...contentPagesProviders],
})
export class ContentPagesModule {}
