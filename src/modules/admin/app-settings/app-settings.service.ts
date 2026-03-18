import { Inject, Injectable } from '@nestjs/common';
import {
  APP_VERSION_LOGS_REPOSITORY,
  SETTINGS_REPOSITORY,
} from 'src/config/constants';
import { AppVersionLogs, KEYS, Settings } from 'src/models';

@Injectable()
export class AppSettingsService {
  constructor(
    @Inject(SETTINGS_REPOSITORY) private settingsRepository: typeof Settings,
    @Inject(APP_VERSION_LOGS_REPOSITORY)
    private appVersionLogsRepository: typeof AppVersionLogs,
  ) {}

  // Get All App Versions
  async getAppVersions() {
    const versions = await this.settingsRepository.findOne({
      attributes: ['id', 'uuid', 'key', 'values'],
      where: { key: KEYS.APP_VERSIONS },
    });
    versions.values = JSON.parse(versions.values);
    return versions;
  }

  // Add App version Logs
  async addAppVersionLogs(
    androidVersion: number,
    iosVersion: number,
    androidForceUpdate: boolean,
    iosForceUpdate: boolean,
  ) {
    return await this.appVersionLogsRepository.create({
      android_version: androidVersion,
      ios_version: iosVersion,
      is_android_force_update: androidForceUpdate,
      is_ios_force_update: iosForceUpdate,
    });
  }

  // Update App Versions
  async updateAppVersions(versions: any) {
    try {
      await this.settingsRepository.update(
        { values: JSON.stringify(versions), updated_at: new Date() },
        { where: { key: KEYS.APP_VERSIONS } },
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  // Check that versions are greater than current versions.
  async checkVersion(
    iosVersion: number,
    androidVersion: number,
    versions: any,
  ) {
    let iosFlag = true;
    let androidFlag = true;
    for (let i = 0; i < versions.length; i++) {
      if (versions[i].platform === 'ios') {
        iosFlag = versions[i].version <= iosVersion;
      }
      androidFlag = versions[i].version <= androidVersion;
    }
    return { iosFlag: iosFlag, androidFlag: androidFlag };
  }
}
