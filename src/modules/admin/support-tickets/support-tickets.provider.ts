import { SupportTickets, TicketMessages } from 'src/models';
import {
  SUPPORT_TICKETS_REPOSITORY,
  TICKET_MESSAGES_REPOSITORY,
} from 'src/config/constants';

export const supportTicketsProviders = [
  {
    provide: SUPPORT_TICKETS_REPOSITORY,
    useValue: SupportTickets,
  },
  {
    provide: TICKET_MESSAGES_REPOSITORY,
    useValue: TicketMessages,
  },
];
