import { Test, TestingModule } from '@nestjs/testing';
import { VerifyOtpService } from './verify_otp.service';

describe('VerifyOtpService', () => {
  let service: VerifyOtpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VerifyOtpService],
    }).compile();

    service = module.get<VerifyOtpService>(VerifyOtpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
