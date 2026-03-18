import { Provider } from '@nestjs/common';
import { BOOKINGS_REPOSITORY, PAYMENTS_REPOSITORY } from '../../../config/constants';
import { Bookings } from '../../../models/Bookings';
import { Payments } from '../../../models/Payments';

/**
 * Provider for Bookings model (for invoice generation)
 */
export const BookingsModelProvider: Provider = {
  provide: BOOKINGS_REPOSITORY,
  useValue: Bookings,
};

/**
 * Provider for Payments model (for linking invoices to payments)
 */
export const PaymentsModelProvider: Provider = {
  provide: PAYMENTS_REPOSITORY,
  useValue: Payments,
};
