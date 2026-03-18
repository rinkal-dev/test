import { Module, Global } from '@nestjs/common';
import { SystemSettingsController } from './system-settings.controller';
import {
  SystemSettingsService,
  SYSTEM_SETTINGS_REPOSITORY,
} from './system-settings.service';
import { SystemSettings } from '../../../models/SystemSettings';

/**
 * System Settings Module
 *
 * Global module that provides system configuration management.
 * Marked as @Global so the service is available throughout the app.
 */
@Global()
@Module({
  controllers: [SystemSettingsController],
  providers: [
    {
      provide: SYSTEM_SETTINGS_REPOSITORY,
      useValue: SystemSettings,
    },
    SystemSettingsService,
  ],
  exports: [SystemSettingsService, SYSTEM_SETTINGS_REPOSITORY],
})
export class SystemSettingsModule {}
