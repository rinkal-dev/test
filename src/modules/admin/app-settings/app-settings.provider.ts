import {
  APP_VERSION_LOGS_REPOSITORY,
  SETTINGS_REPOSITORY,
} from 'src/config/constants';
import { AppVersionLogs, Settings } from 'src/models';

export const settingsProviders = [
  {
    provide: SETTINGS_REPOSITORY,
    useValue: Settings,
  },
  {
    provide: APP_VERSION_LOGS_REPOSITORY,
    useValue: AppVersionLogs,
  },
];
