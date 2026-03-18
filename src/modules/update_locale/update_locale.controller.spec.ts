import { Test, TestingModule } from '@nestjs/testing';
import { UpdateLocaleController } from './update_locale.controller';

describe('UpdateLocaleController', () => {
  let controller: UpdateLocaleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UpdateLocaleController],
    }).compile();

    controller = module.get<UpdateLocaleController>(UpdateLocaleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
