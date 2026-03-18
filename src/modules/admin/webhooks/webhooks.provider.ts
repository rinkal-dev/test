import {
  WEBHOOKS_REPOSITORY,
  WEBHOOK_DELIVERY_LOGS_REPOSITORY,
} from 'src/config/constants';
import { Webhooks, WebhookDeliveryLogs } from 'src/models';

export const webhooksProviders = [
  {
    provide: WEBHOOKS_REPOSITORY,
    useValue: Webhooks,
  },
  {
    provide: WEBHOOK_DELIVERY_LOGS_REPOSITORY,
    useValue: WebhookDeliveryLogs,
  },
];
