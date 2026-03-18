import { Inject, Injectable } from '@nestjs/common';
import { Seeder } from 'nestjs-seeder';
import { SETTINGS_REPOSITORY } from 'src/config/constants';
import { Settings, KEYS, DEVICES } from 'src/models';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SettingsSeeder implements Seeder {
  constructor(
    @Inject(SETTINGS_REPOSITORY) private settingsRepository: typeof Settings,
  ) {}

  seed = async (): Promise<any> => {
    const appVersionsValues = [
      {
        platform: DEVICES.IOS,
        version: 0,
        force_updatable: false,
      },
      {
        platform: DEVICES.ANDROID,
        version: 0,
        force_updatable: false,
      },
    ];
    return this.settingsRepository.create({
      uuid: uuidv4(),
      key: KEYS.APP_VERSIONS,
      values: JSON.stringify(appVersionsValues),
    });
  };

  drop = async (): Promise<any> => {
    return this.settingsRepository.destroy({
      where: { key: KEYS.APP_VERSIONS },
    });
  };
}
