import { Test, TestingModule } from '@nestjs/testing';
import { ContentPagesService } from './content-pages.service';

describe('ContentPagesService', () => {
  let service: ContentPagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentPagesService],
    }).compile();

    service = module.get<ContentPagesService>(ContentPagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
