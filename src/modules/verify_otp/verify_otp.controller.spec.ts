import { Test, TestingModule } from '@nestjs/testing';
import { VerifyOtpController } from './verify_otp.controller';

describe('VerifyOtpController', () => {
  let controller: VerifyOtpController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VerifyOtpController],
    }).compile();

    controller = module.get<VerifyOtpController>(VerifyOtpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
