import { Module } from '@nestjs/common';
import { SupportTicketsController } from './support-tickets.controller';
import { SupportTicketsService } from './support-tickets.service';
import { supportTicketsProviders } from './support-tickets.provider';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { SupportTicketEmailService } from 'src/modules/public/support-tickets/support-ticket-email.service';
import { ADMINS_REPOSITORY } from 'src/config/constants';
import { Admins } from 'src/models';

@Module({
  imports: [ActivityLogsModule],
  controllers: [SupportTicketsController],
  providers: [
    SupportTicketsService,
    SupportTicketEmailService,
    ...supportTicketsProviders,
    {
      provide: ADMINS_REPOSITORY,
      useValue: Admins,
    },
  ],
  exports: [SupportTicketsService, SupportTicketEmailService],
})
export class SupportTicketsModule {}
