import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import {
  WEBHOOKS_REPOSITORY,
  WEBHOOK_DELIVERY_LOGS_REPOSITORY,
} from 'src/config/constants';
import { Webhooks, WebhookDeliveryLogs } from 'src/models';
import { EventsModule } from '../events/events.module';

const webhooksProviders = [
  {
    provide: WEBHOOKS_REPOSITORY,
    useValue: Webhooks,
  },
  {
    provide: WEBHOOK_DELIVERY_LOGS_REPOSITORY,
    useValue: WebhookDeliveryLogs,
  },
];

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    forwardRef(() => EventsModule),
  ],
  providers: [WebhookDispatcherService, ...webhooksProviders],
  exports: [WebhookDispatcherService, ...webhooksProviders],
})
export class WebhooksModule {}
