/**
 * ============================================
 * BOOKING WIZARD PROVIDERS
 * ============================================
 *
 * Repository providers for the booking wizard module.
 * Uses the repository abstraction pattern to support both
 * Sequelize and Supabase database providers.
 */

// Re-export from central repository provider
export {
  BookingWizardRepositoryProvider,
  BookingWizardModelProviders,
} from 'src/core/repositories';
