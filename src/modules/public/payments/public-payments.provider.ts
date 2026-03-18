import { Payments } from '../../../models/Payments';
import { Bookings } from '../../../models/Bookings';

export const publicPaymentsProviders = [
  {
    provide: 'PAYMENTS_REPOSITORY',
    useValue: Payments,
  },
  {
    provide: 'BOOKINGS_REPOSITORY',
    useValue: Bookings,
  },
];
