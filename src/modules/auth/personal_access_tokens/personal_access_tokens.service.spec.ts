import { Test, TestingModule } from '@nestjs/testing';
import { PersonalAccessTokensService } from './personal_access_tokens.service';

describe('PersonalAccessTokensService', () => {
  let service: PersonalAccessTokensService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PersonalAccessTokensService],
    }).compile();

    service = module.get<PersonalAccessTokensService>(
      PersonalAccessTokensService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
