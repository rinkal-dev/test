import { ACTIVITY_LOGS_REPOSITORY } from 'src/config/constants';
import { ActivityLogs } from 'src/models';

export const activityLogsProviders = [
  {
    provide: ACTIVITY_LOGS_REPOSITORY,
    useValue: ActivityLogs,
  },
];
