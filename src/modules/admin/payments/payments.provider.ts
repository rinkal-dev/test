import {
  PAYMENTS_REPOSITORY,
  BOOKINGS_REPOSITORY,
  WEDDING_GROUPS_REPOSITORY,
  REFUNDS_REPOSITORY,
  CANCELLATION_POLICIES_REPOSITORY,
} from 'src/config/constants';
import { Payments, Bookings, WeddingGroups, Refunds, CancellationPolicies } from 'src/models';

export const paymentsProviders = [
  {
    provide: PAYMENTS_REPOSITORY,
    useValue: Payments,
  },
  {
    provide: BOOKINGS_REPOSITORY,
    useValue: Bookings,
  },
  {
    provide: WEDDING_GROUPS_REPOSITORY,
    useValue: WeddingGroups,
  },
  {
    provide: REFUNDS_REPOSITORY,
    useValue: Refunds,
  },
  {
    provide: CANCELLATION_POLICIES_REPOSITORY,
    useValue: CancellationPolicies,
  },
];
