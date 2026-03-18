import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { UpdateLocaleController } from './update_locale.controller';
import { UpdateLocaleService } from './update_locale.service';

@Module({
  imports: [UsersModule],
  controllers: [UpdateLocaleController],
  providers: [UpdateLocaleService],
})
export class UpdateLocaleModule {}
