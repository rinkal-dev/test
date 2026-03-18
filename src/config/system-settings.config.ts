/**
 * System Settings Configuration
 *
 * This file defines all allowed system settings that can be configured via Admin UI.
 * Only settings defined here can be modified - this is a SECURITY whitelist.
 *
 * IMPORTANT: Settings NOT in this list will be rejected by the API.
 */

export interface SettingDefinition {
  key: string;
  label: string;
  description: string;
  category: string;
  isSecret: boolean;
  defaultValue?: string;
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  };
}

export type SettingCategory = 'email' | 'stripe' | 'google' | 'ai' | 'app' | 'branding';

/**
 * WHITELIST of allowed settings
 * Only these settings can be stored/modified via the Admin UI
 */
export const SETTINGS_DEFINITIONS: Record<string, SettingDefinition> = {
  // ============================================
  // EMAIL SETTINGS
  // ============================================
  MAIL_HOST: {
    key: 'MAIL_HOST',
    label: 'SMTP Host',
    description: 'SMTP server hostname (e.g., smtp.gmail.com)',
    category: 'email',
    isSecret: false,
    defaultValue: 'smtp.gmail.com',
    validation: { required: true, maxLength: 255 },
  },
  MAIL_PORT: {
    key: 'MAIL_PORT',
    label: 'SMTP Port',
    description: 'SMTP server port (465 for SSL, 587 for TLS)',
    category: 'email',
    isSecret: false,
    defaultValue: '465',
    validation: { required: true, pattern: /^\d+$/ },
  },
  MAIL_USERNAME: {
    key: 'MAIL_USERNAME',
    label: 'SMTP Username',
    description: 'Email address for SMTP authentication',
    category: 'email',
    isSecret: false,
    validation: { required: true, maxLength: 255 },
  },
  MAIL_PASSWORD: {
    key: 'MAIL_PASSWORD',
    label: 'SMTP Password',
    description: 'App password for SMTP authentication',
    category: 'email',
    isSecret: true, // ENCRYPTED
    validation: { required: true },
  },
  MAIL_ENCRYPTION: {
    key: 'MAIL_ENCRYPTION',
    label: 'Encryption',
    description: 'Email encryption type (ssl or tls)',
    category: 'email',
    isSecret: false,
    defaultValue: 'ssl',
    validation: { pattern: /^(ssl|tls)$/ },
  },
  MAIL_FROM_ADDRESS: {
    key: 'MAIL_FROM_ADDRESS',
    label: 'From Email',
    description: 'Default sender email address',
    category: 'email',
    isSecret: false,
    validation: { required: true, maxLength: 255 },
  },
  MAIL_FROM_NAME: {
    key: 'MAIL_FROM_NAME',
    label: 'From Name',
    description: 'Default sender display name',
    category: 'email',
    isSecret: false,
    defaultValue: 'DestaPay',
    validation: { maxLength: 100 },
  },

  // ============================================
  // STRIPE SETTINGS
  // ============================================
  STRIPE_MODE: {
    key: 'STRIPE_MODE',
    label: 'Stripe Mode',
    description: 'Select "test" for development/testing or "live" for production payments',
    category: 'stripe',
    isSecret: false,
    defaultValue: 'test',
    validation: { required: true, pattern: /^(test|live)$/ },
  },

  // Test Mode Keys
  STRIPE_TEST_PUBLISHABLE_KEY: {
    key: 'STRIPE_TEST_PUBLISHABLE_KEY',
    label: 'Test Publishable Key',
    description: 'Stripe test publishable key (starts with pk_test_)',
    category: 'stripe',
    isSecret: false,
    validation: { pattern: /^pk_test_/ },
  },
  STRIPE_TEST_SECRET_KEY: {
    key: 'STRIPE_TEST_SECRET_KEY',
    label: 'Test Secret Key',
    description: 'Stripe test secret key (starts with sk_test_)',
    category: 'stripe',
    isSecret: true,
    validation: { pattern: /^sk_test_/ },
  },
  STRIPE_TEST_WEBHOOK_SECRET: {
    key: 'STRIPE_TEST_WEBHOOK_SECRET',
    label: 'Test Webhook Secret',
    description: 'Stripe test webhook signing secret (starts with whsec_)',
    category: 'stripe',
    isSecret: true,
    validation: { pattern: /^whsec_/ },
  },

  // Live Mode Keys
  STRIPE_LIVE_PUBLISHABLE_KEY: {
    key: 'STRIPE_LIVE_PUBLISHABLE_KEY',
    label: 'Live Publishable Key',
    description: 'Stripe live publishable key (starts with pk_live_)',
    category: 'stripe',
    isSecret: false,
    validation: { pattern: /^pk_live_/ },
  },
  STRIPE_LIVE_SECRET_KEY: {
    key: 'STRIPE_LIVE_SECRET_KEY',
    label: 'Live Secret Key',
    description: 'Stripe live secret key (starts with sk_live_)',
    category: 'stripe',
    isSecret: true,
    validation: { pattern: /^sk_live_/ },
  },
  STRIPE_LIVE_WEBHOOK_SECRET: {
    key: 'STRIPE_LIVE_WEBHOOK_SECRET',
    label: 'Live Webhook Secret',
    description: 'Stripe live webhook signing secret (starts with whsec_)',
    category: 'stripe',
    isSecret: true,
    validation: { pattern: /^whsec_/ },
  },

  // ============================================
  // GOOGLE SETTINGS
  // ============================================
  GOOGLE_PLACES_API_KEY: {
    key: 'GOOGLE_PLACES_API_KEY',
    label: 'Places API Key',
    description: 'Google Places API key for location autocomplete',
    category: 'google',
    isSecret: true, // ENCRYPTED
    validation: { pattern: /^AIza/ },
  },

  // ============================================
  // AI SETTINGS
  // ============================================
  GEMINI_API_KEY: {
    key: 'GEMINI_API_KEY',
    label: 'Gemini API Key',
    description: 'Google Gemini API key for Smart Import feature',
    category: 'ai',
    isSecret: true, // ENCRYPTED
    validation: { pattern: /^AIza/ },
  },

  // ============================================
  // APP SETTINGS
  // ============================================
  APP_NAME: {
    key: 'APP_NAME',
    label: 'Application Name',
    description: 'Application display name used in emails and UI',
    category: 'app',
    isSecret: false,
    defaultValue: 'DestaPay',
    validation: { required: true, maxLength: 100 },
  },
  FRONTEND_URL: {
    key: 'FRONTEND_URL',
    label: 'Frontend URL',
    description: 'Frontend application URL for email links',
    category: 'app',
    isSecret: false,
    validation: { required: true, pattern: /^https?:\/\// },
  },

  // ============================================
  // BRANDING SETTINGS
  // ============================================
  APP_LOGO_URL: {
    key: 'APP_LOGO_URL',
    label: 'Logo URL',
    description: 'Logo image URL for email templates and branding (uploaded via Branding settings)',
    category: 'branding',
    isSecret: false,
    validation: { maxLength: 500 },
  },
  BRANDING_PRIMARY_COLOR: {
    key: 'BRANDING_PRIMARY_COLOR',
    label: 'Primary Color',
    description: 'Primary brand color (hex format, e.g., #756050)',
    category: 'branding',
    isSecret: false,
    defaultValue: '#756050',
    validation: { pattern: /^#[0-9A-Fa-f]{6}$/ },
  },
};

/**
 * Get setting definition by key
 */
export const getSettingDefinition = (key: string): SettingDefinition | undefined => {
  return SETTINGS_DEFINITIONS[key];
};

/**
 * Check if a setting key is allowed (whitelisted)
 */
export const isAllowedSetting = (key: string): boolean => {
  return key in SETTINGS_DEFINITIONS;
};

/**
 * Get all settings by category
 */
export const getSettingsByCategory = (category: SettingCategory): SettingDefinition[] => {
  return Object.values(SETTINGS_DEFINITIONS).filter((s) => s.category === category);
};

/**
 * Get all categories
 */
export const getAllCategories = (): string[] => {
  const categories = new Set(Object.values(SETTINGS_DEFINITIONS).map((s) => s.category));
  return Array.from(categories);
};

/**
 * Get all secret setting keys (for encryption)
 */
export const getSecretSettingKeys = (): string[] => {
  return Object.values(SETTINGS_DEFINITIONS)
    .filter((s) => s.isSecret)
    .map((s) => s.key);
};

/**
 * Validate a setting value against its definition
 */
export const validateSettingValue = (
  key: string,
  value: string,
): { valid: boolean; error?: string } => {
  const definition = SETTINGS_DEFINITIONS[key];

  if (!definition) {
    return { valid: false, error: `Setting '${key}' is not allowed` };
  }

  const { validation } = definition;
  if (!validation) {
    return { valid: true };
  }

  if (validation.required && (!value || value.trim() === '')) {
    return { valid: false, error: `${definition.label} is required` };
  }

  if (value && validation.minLength && value.length < validation.minLength) {
    return { valid: false, error: `${definition.label} must be at least ${validation.minLength} characters` };
  }

  if (value && validation.maxLength && value.length > validation.maxLength) {
    return { valid: false, error: `${definition.label} must not exceed ${validation.maxLength} characters` };
  }

  if (value && validation.pattern && !validation.pattern.test(value)) {
    return { valid: false, error: `${definition.label} has invalid format` };
  }

  return { valid: true };
};
