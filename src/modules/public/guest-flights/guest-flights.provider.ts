/**
 * ============================================
 * GUEST FLIGHTS PROVIDERS (Guest Portal)
 * ============================================
 *
 * Provider configuration for guest flights module.
 * Uses repository abstraction to support both Sequelize and Supabase.
 */

import {
  GuestFlightsRepositoryProvider,
  GuestFlightsModelProviders,
} from '../../../core/repositories/guest-flights.repository.provider';

export const guestFlightsProviders = [
  GuestFlightsRepositoryProvider,
  ...GuestFlightsModelProviders,
];
