import { Test, TestingModule } from '@nestjs/testing';
import { SendOtpService } from './send_otp.service';

describe('SendOtpService', () => {
  let service: SendOtpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SendOtpService],
    }).compile();

    service = module.get<SendOtpService>(SendOtpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
