import { Test, TestingModule } from '@nestjs/testing';
import { SubAdminService } from './sub-admins.service';

describe('SubAdminService', () => {
  let service: SubAdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubAdminService],
    }).compile();

    service = module.get<SubAdminService>(SubAdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
