import { Test, TestingModule } from '@nestjs/testing';
import { UpdatePasswordController } from './update_password.controller';

describe('UpdatePasswordController', () => {
  let controller: UpdatePasswordController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UpdatePasswordController],
    }).compile();

    controller = module.get<UpdatePasswordController>(UpdatePasswordController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
