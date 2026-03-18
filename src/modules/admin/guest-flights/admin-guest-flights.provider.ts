/**
 * ============================================
 * ADMIN GUEST FLIGHTS PROVIDERS
 * ============================================
 *
 * Provider configuration for admin guest flights module.
 * Uses repository abstraction to support both Sequelize and Supabase.
 */

import {
  GuestFlightsRepositoryProvider,
  GuestFlightsModelProviders,
} from 'src/core/repositories/guest-flights.repository.provider';

export const adminGuestFlightsProviders = [
  GuestFlightsRepositoryProvider,
  ...GuestFlightsModelProviders,
];
