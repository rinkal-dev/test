/**
 * ============================================
 * REPOSITORIES EXPORTS
 * ============================================
 * Central export point for all repository interfaces,
 * implementations, and providers.
 */

// Base interfaces
export * from './base.repository.interface';

// Entity Repository Interfaces
export * from './hotel.repository.interface';
export * from './user.repository.interface';
export * from './admin.repository.interface';
export * from './role.repository.interface';
// Permission interface exports PermissionEntity which conflicts with role.repository.interface
// Export specific items only
export {
  IPermissionRepository,
  CreatePermissionData,
  UpdatePermissionData,
  PermissionQueryParams,
  PERMISSION_REPOSITORY,
} from './permission.repository.interface';
export * from './location.repository.interface';
export * from './content-page.repository.interface';
export * from './settings.repository.interface';
export * from './auth.repository.interface';

// Hotel Repository
export * from './hotel.repository.provider';
export * from './sequelize/sequelize-hotel.repository';
export * from './supabase/supabase-hotel.repository';

// Wedding Group Repository
export * from './wedding-group.repository.interface';
export * from './wedding-group.repository.provider';
export * from './sequelize/sequelize-wedding-group.repository';

// Booking Wizard Repository
export * from './booking-wizard.repository.interface';
export * from './booking-wizard.repository.provider';
export * from './sequelize/sequelize-booking-wizard.repository';
export * from './supabase/supabase-booking-wizard.repository';

// Guest Auth Repository
export * from './guest-auth.repository.interface';
export * from './guest-auth.repository.provider';
export * from './sequelize/sequelize-guest-auth.repository';
export * from './supabase/supabase-guest-auth.repository';

// Invoice Repository
export * from './invoice.repository.interface';
export * from './invoice.repository.provider';
export * from './sequelize/sequelize-invoice.repository';
export * from './supabase/supabase-invoice.repository';

// Sequelize Repositories
export * from './sequelize/sequelize-user.repository';
export * from './sequelize/sequelize-admin.repository';
export * from './sequelize/sequelize-role.repository';
export * from './sequelize/sequelize-permission.repository';
export * from './sequelize/sequelize-location.repository';
export * from './sequelize/sequelize-content-page.repository';
export * from './sequelize/sequelize-settings.repository';
export * from './sequelize/sequelize-auth.repository';

// Supabase Repositories
export * from './supabase/supabase-user.repository';

// All Repository Providers (contains all provider factories)
export {
  ModelProviders,
  AdminRepositoryProvider,
  UserRepositoryProvider,
  RoleRepositoryProvider,
  PermissionRepositoryProvider,
  CountryRepositoryProvider,
  StateRepositoryProvider,
  CityRepositoryProvider,
  ContentPageRepositoryProvider,
  SettingsRepositoryProvider,
  PersonalAccessTokenRepositoryProvider,
  PasswordResetRepositoryProvider,
  SocialLoginRepositoryProvider,
  InvoiceRepositoryProvider,
  AllRepositoryProviders,
} from './all.repository.providers';
