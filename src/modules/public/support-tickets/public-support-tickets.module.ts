import { Module } from '@nestjs/common';
import { PublicSupportTicketsController } from './public-support-tickets.controller';
import { PublicSupportTicketsService } from './public-support-tickets.service';
import { SupportTicketEmailService } from './support-ticket-email.service';
import { supportTicketsProviders } from 'src/modules/admin/support-tickets/support-tickets.provider';
import { ADMINS_REPOSITORY } from 'src/config/constants';
import { Admins } from 'src/models';

@Module({
  controllers: [PublicSupportTicketsController],
  providers: [
    PublicSupportTicketsService,
    SupportTicketEmailService,
    ...supportTicketsProviders,
    {
      provide: ADMINS_REPOSITORY,
      useValue: Admins,
    },
  ],
  exports: [PublicSupportTicketsService, SupportTicketEmailService],
})
export class PublicSupportTicketsModule {}
