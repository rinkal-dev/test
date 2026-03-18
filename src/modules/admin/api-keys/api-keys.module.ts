import { Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { apiKeysProviders } from './api-keys.provider';
import { ApiKeyGuard } from './api-key.guard';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [ActivityLogsModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeyGuard, ...apiKeysProviders],
  exports: [ApiKeysService, ApiKeyGuard],
})
export class ApiKeysModule {}
