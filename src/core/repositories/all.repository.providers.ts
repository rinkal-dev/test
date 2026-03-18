/**
 * ============================================
 * ALL REPOSITORY PROVIDERS
 * ============================================
 * Central file for all repository provider factories.
 * These automatically switch between Sequelize and Supabase.
 */

import { Provider } from '@nestjs/common';
import {
  ADMINS_REPOSITORY,
  USERS_REPOSITORY,
  ROLES_REPOSITORY,
  PERMISSIONS_REPOSITORY,
  ROLE_HAS_PERMISSIONS_REPOSITORY,
  COUNTRIES_REPOSITORY,
  STATES_REPOSITORY,
  CITIES_REPOSITORY,
  CONTENT_PAGES_REPOSITORY,
  SETTINGS_REPOSITORY,
  PERSONAL_ACCESS_TOKENS_REPOSITORY,
  PASSWORD_RESETS_REPOSITORY,
  SOCIAL_LOGINS_REPOSITORY,
  INVOICES_REPOSITORY,
} from '../../config/constants';
import { DatabaseProvider, getDatabaseConfig } from '../../config/database.config';

// Models
import { Admins } from '../../models/Admins';
import { Users } from '../../models/Users';
import { Roles } from '../../models/Roles';
import { Permissions } from '../../models/Permissions';
import { RoleHasPermissions } from '../../models/RoleHasPermissions';
import { Countries } from '../../models/Countries';
import { States } from '../../models/States';
import { Cities } from '../../models/Cities';
import { ContentPages } from '../../models/ContentPages';
import { Settings } from '../../models/Settings';
import { PersonalAccessTokens } from '../../models/PersonalAccessTokens';
import { PasswordResets } from '../../models/PasswordResets';
import { SocialLogins } from '../../models/SocialLogins';
import { Invoices } from '../../models/Invoices';

// Repository Interfaces
import { ADMIN_REPOSITORY } from './admin.repository.interface';
import { USER_REPOSITORY } from './user.repository.interface';
import { ROLE_REPOSITORY } from './role.repository.interface';
import { PERMISSION_REPOSITORY } from './permission.repository.interface';
import { COUNTRY_REPOSITORY, STATE_REPOSITORY, CITY_REPOSITORY } from './location.repository.interface';
import { CONTENT_PAGE_REPOSITORY } from './content-page.repository.interface';
import { SETTINGS_REPOSITORY as SETTINGS_REPO_TOKEN } from './settings.repository.interface';
import {
  PERSONAL_ACCESS_TOKEN_REPOSITORY,
  PASSWORD_RESET_REPOSITORY,
  SOCIAL_LOGIN_REPOSITORY,
} from './auth.repository.interface';
import { INVOICE_REPOSITORY } from './invoice.repository.interface';

// Sequelize Implementations
import { SequelizeAdminRepository } from './sequelize/sequelize-admin.repository';
import { SequelizeUserRepository } from './sequelize/sequelize-user.repository';
import { SequelizeRoleRepository } from './sequelize/sequelize-role.repository';
import { SequelizePermissionRepository } from './sequelize/sequelize-permission.repository';
import {
  SequelizeCountryRepository,
  SequelizeStateRepository,
  SequelizeCityRepository,
} from './sequelize/sequelize-location.repository';
import { SequelizeContentPageRepository } from './sequelize/sequelize-content-page.repository';
import { SequelizeSettingsRepository } from './sequelize/sequelize-settings.repository';
import {
  SequelizePersonalAccessTokenRepository,
  SequelizePasswordResetRepository,
  SequelizeSocialLoginRepository,
} from './sequelize/sequelize-auth.repository';
import { SequelizeInvoiceRepository } from './sequelize/sequelize-invoice.repository';

// Supabase Implementations (placeholders - use same structure as User)
import { SupabaseUserRepository } from './supabase/supabase-user.repository';
import { SupabaseInvoiceRepository } from './supabase/supabase-invoice.repository';

// ============================================
// MODEL PROVIDERS (Sequelize models for injection)
// ============================================
export const ModelProviders: Provider[] = [
  { provide: ADMINS_REPOSITORY, useValue: Admins },
  { provide: USERS_REPOSITORY, useValue: Users },
  { provide: ROLES_REPOSITORY, useValue: Roles },
  { provide: PERMISSIONS_REPOSITORY, useValue: Permissions },
  { provide: ROLE_HAS_PERMISSIONS_REPOSITORY, useValue: RoleHasPermissions },
  { provide: COUNTRIES_REPOSITORY, useValue: Countries },
  { provide: STATES_REPOSITORY, useValue: States },
  { provide: CITIES_REPOSITORY, useValue: Cities },
  { provide: CONTENT_PAGES_REPOSITORY, useValue: ContentPages },
  { provide: SETTINGS_REPOSITORY, useValue: Settings },
  { provide: PERSONAL_ACCESS_TOKENS_REPOSITORY, useValue: PersonalAccessTokens },
  { provide: PASSWORD_RESETS_REPOSITORY, useValue: PasswordResets },
  { provide: SOCIAL_LOGINS_REPOSITORY, useValue: SocialLogins },
  { provide: INVOICES_REPOSITORY, useValue: Invoices },
];

// ============================================
// REPOSITORY PROVIDERS (Auto-switch based on config)
// ============================================

const config = getDatabaseConfig();
const isSupabase = config.provider === DatabaseProvider.SUPABASE;

// Admin Repository
export const AdminRepositoryProvider: Provider = {
  provide: ADMIN_REPOSITORY,
  useFactory: (adminsModel: typeof Admins) => {
    if (isSupabase) {
      console.log('📦 Using Supabase Admin Repository');
      // TODO: Implement SupabaseAdminRepository
      return new SequelizeAdminRepository(adminsModel);
    }
    console.log('📦 Using Sequelize Admin Repository');
    return new SequelizeAdminRepository(adminsModel);
  },
  inject: [ADMINS_REPOSITORY],
};

// User Repository
export const UserRepositoryProvider: Provider = {
  provide: USER_REPOSITORY,
  useFactory: (usersModel: typeof Users) => {
    if (isSupabase) {
      console.log('📦 Using Supabase User Repository');
      return new SupabaseUserRepository();
    }
    console.log('📦 Using Sequelize User Repository');
    return new SequelizeUserRepository(usersModel);
  },
  inject: [USERS_REPOSITORY],
};

// Role Repository
export const RoleRepositoryProvider: Provider = {
  provide: ROLE_REPOSITORY,
  useFactory: (rolesModel: typeof Roles, roleHasPermissionsModel: typeof RoleHasPermissions) => {
    if (isSupabase) {
      console.log('📦 Using Supabase Role Repository');
      return new SequelizeRoleRepository(rolesModel, roleHasPermissionsModel);
    }
    console.log('📦 Using Sequelize Role Repository');
    return new SequelizeRoleRepository(rolesModel, roleHasPermissionsModel);
  },
  inject: [ROLES_REPOSITORY, ROLE_HAS_PERMISSIONS_REPOSITORY],
};

// Permission Repository
export const PermissionRepositoryProvider: Provider = {
  provide: PERMISSION_REPOSITORY,
  useFactory: (permissionsModel: typeof Permissions) => {
    if (isSupabase) {
      console.log('📦 Using Supabase Permission Repository');
      return new SequelizePermissionRepository(permissionsModel);
    }
    console.log('📦 Using Sequelize Permission Repository');
    return new SequelizePermissionRepository(permissionsModel);
  },
  inject: [PERMISSIONS_REPOSITORY],
};

// Country Repository
export const CountryRepositoryProvider: Provider = {
  provide: COUNTRY_REPOSITORY,
  useFactory: (countriesModel: typeof Countries) => {
    if (isSupabase) {
      console.log('📦 Using Supabase Country Repository');
      return new SequelizeCountryRepository(countriesModel);
    }
    console.log('📦 Using Sequelize Country Repository');
    return new SequelizeCountryRepository(countriesModel);
  },
  inject: [COUNTRIES_REPOSITORY],
};

// State Repository
export const StateRepositoryProvider: Provider = {
  provide: STATE_REPOSITORY,
  useFactory: (statesModel: typeof States) => {
    if (isSupabase) {
      console.log('📦 Using Supabase State Repository');
      return new SequelizeStateRepository(statesModel);
    }
    console.log('📦 Using Sequelize State Repository');
    return new SequelizeStateRepository(statesModel);
  },
  inject: [STATES_REPOSITORY],
};

// City Repository
export const CityRepositoryProvider: Provider = {
  provide: CITY_REPOSITORY,
  useFactory: (citiesModel: typeof Cities) => {
    if (isSupabase) {
      console.log('📦 Using Supabase City Repository');
      return new SequelizeCityRepository(citiesModel);
    }
    console.log('📦 Using Sequelize City Repository');
    return new SequelizeCityRepository(citiesModel);
  },
  inject: [CITIES_REPOSITORY],
};

// Content Page Repository
export const ContentPageRepositoryProvider: Provider = {
  provide: CONTENT_PAGE_REPOSITORY,
  useFactory: (contentPagesModel: typeof ContentPages) => {
    if (isSupabase) {
      console.log('📦 Using Supabase ContentPage Repository');
      return new SequelizeContentPageRepository(contentPagesModel);
    }
    console.log('📦 Using Sequelize ContentPage Repository');
    return new SequelizeContentPageRepository(contentPagesModel);
  },
  inject: [CONTENT_PAGES_REPOSITORY],
};

// Settings Repository
export const SettingsRepositoryProvider: Provider = {
  provide: SETTINGS_REPO_TOKEN,
  useFactory: (settingsModel: typeof Settings) => {
    if (isSupabase) {
      console.log('📦 Using Supabase Settings Repository');
      return new SequelizeSettingsRepository(settingsModel);
    }
    console.log('📦 Using Sequelize Settings Repository');
    return new SequelizeSettingsRepository(settingsModel);
  },
  inject: [SETTINGS_REPOSITORY],
};

// Personal Access Token Repository
export const PersonalAccessTokenRepositoryProvider: Provider = {
  provide: PERSONAL_ACCESS_TOKEN_REPOSITORY,
  useFactory: (tokensModel: typeof PersonalAccessTokens) => {
    if (isSupabase) {
      console.log('📦 Using Supabase PersonalAccessToken Repository');
      return new SequelizePersonalAccessTokenRepository(tokensModel);
    }
    console.log('📦 Using Sequelize PersonalAccessToken Repository');
    return new SequelizePersonalAccessTokenRepository(tokensModel);
  },
  inject: [PERSONAL_ACCESS_TOKENS_REPOSITORY],
};

// Password Reset Repository
export const PasswordResetRepositoryProvider: Provider = {
  provide: PASSWORD_RESET_REPOSITORY,
  useFactory: (passwordResetsModel: typeof PasswordResets) => {
    if (isSupabase) {
      console.log('📦 Using Supabase PasswordReset Repository');
      return new SequelizePasswordResetRepository(passwordResetsModel);
    }
    console.log('📦 Using Sequelize PasswordReset Repository');
    return new SequelizePasswordResetRepository(passwordResetsModel);
  },
  inject: [PASSWORD_RESETS_REPOSITORY],
};

// Social Login Repository
export const SocialLoginRepositoryProvider: Provider = {
  provide: SOCIAL_LOGIN_REPOSITORY,
  useFactory: (socialLoginsModel: typeof SocialLogins) => {
    if (isSupabase) {
      console.log('📦 Using Supabase SocialLogin Repository');
      return new SequelizeSocialLoginRepository(socialLoginsModel);
    }
    console.log('📦 Using Sequelize SocialLogin Repository');
    return new SequelizeSocialLoginRepository(socialLoginsModel);
  },
  inject: [SOCIAL_LOGINS_REPOSITORY],
};

// Invoice Repository
export const InvoiceRepositoryProvider: Provider = {
  provide: INVOICE_REPOSITORY,
  useFactory: (invoicesModel: typeof Invoices) => {
    if (isSupabase) {
      console.log('📦 Using Supabase Invoice Repository');
      return new SupabaseInvoiceRepository();
    }
    console.log('📦 Using Sequelize Invoice Repository');
    return new SequelizeInvoiceRepository(invoicesModel);
  },
  inject: [INVOICES_REPOSITORY],
};

// ============================================
// ALL REPOSITORY PROVIDERS (Export as array)
// ============================================
export const AllRepositoryProviders: Provider[] = [
  ...ModelProviders,
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
];
