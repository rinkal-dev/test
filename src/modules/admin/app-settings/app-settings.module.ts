import { Module } from '@nestjs/common';
import { AppSettingsController } from './app-settings.controller';
import { AppSettingsService } from './app-settings.service';
import { settingsProviders } from './app-settings.provider';

@Module({
  imports: [],
  controllers: [AppSettingsController],
  providers: [AppSettingsService, ...settingsProviders],
})
export class AppSettingsModule {}
