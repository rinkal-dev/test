import { Test, TestingModule } from '@nestjs/testing';
import { UpdateLocaleService } from './update_locale.service';

describe('UpdateLocaleService', () => {
  let service: UpdateLocaleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UpdateLocaleService],
    }).compile();

    service = module.get<UpdateLocaleService>(UpdateLocaleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
