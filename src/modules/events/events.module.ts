import { Module, forwardRef } from '@nestjs/common';
import { EventsService } from './events.service';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [forwardRef(() => WebhooksModule)],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
