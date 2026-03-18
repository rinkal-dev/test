import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { webhooksProviders } from './webhooks.provider';
import { WebhooksModule as SharedWebhooksModule } from 'src/modules/webhooks/webhooks.module';

@Module({
  imports: [SharedWebhooksModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, ...webhooksProviders],
  exports: [WebhooksService],
})
export class AdminWebhooksModule {}
