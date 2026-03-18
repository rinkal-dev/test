import { Inject, Injectable } from '@nestjs/common';
import { SETTINGS_REPOSITORY } from 'src/config/constants';
import { KEYS, Settings } from 'src/models';

@Injectable()
export class SettingService {
  constructor(
    @Inject(SETTINGS_REPOSITORY) private settingsRepository: typeof Settings,
  ) {}

  async getAppVersion(platform) {
    const versions = await this.settingsRepository.findOne({
      where: { key: KEYS.APP_VERSIONS },
      raw: true,
    });
    const version = JSON.parse(versions.values);
    for (let i = 0; i < version.length; i++) {
      if (platform === version[i].platform) {
        return version[i];
      }
    }
  }
}
