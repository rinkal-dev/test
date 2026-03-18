import { Test, TestingModule } from '@nestjs/testing';
import { ContentPageController } from './content_page.controller';

describe('ContentPageController', () => {
  let controller: ContentPageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentPageController],
    }).compile();

    controller = module.get<ContentPageController>(ContentPageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
