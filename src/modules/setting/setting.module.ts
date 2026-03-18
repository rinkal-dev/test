import { Module } from '@nestjs/common';
import { SettingController } from './setting.controller';
import { SettingService } from './setting.service';
import { settingsProviders } from '../admin/app-settings/app-settings.provider';

@Module({
  imports: [],
  controllers: [SettingController],
  providers: [SettingService, ...settingsProviders],
})
export class SettingModule {}
