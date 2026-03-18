/**
 * ============================================
 * CENTRAL APP CONFIGURATION
 * ============================================
 *
 * All configurable values should be defined here.
 * Change values in ONE place - affects entire system.
 *
 * Structure:
 * - app: General app settings
 * - features: Feature flags (enable/disable features)
 * - hotels: Hotel-related settings
 * - uploads: File upload settings
 * - validation: Field validation rules
 * - pagination: Default pagination settings
 * - cache: Caching settings
 */

import { getEnvironmentData } from '../helpers/general';

export interface AppConfig {
  app: AppSettings;
  features: FeatureFlags;
  hotels: HotelSettings;
  uploads: UploadSettings;
  validation: ValidationRules;
  pagination: PaginationSettings;
  cache: CacheSettings;
}

// ============================================
// APP SETTINGS
// ============================================
export interface AppSettings {
  name: string;
  version: string;
  environment: string;
  baseUrl: string;
  apiPrefix: string;
  timezone: string;
  dateFormat: string;
  currency: CurrencySettings;
}

export interface CurrencySettings {
  code: string;
  symbol: string;
  position: 'before' | 'after';
  decimalPlaces: number;
}

// ============================================
// FEATURE FLAGS
// ============================================
export interface FeatureFlags {
  enableSmartImport: boolean;        // AI-powered hotel import
  enableMultipleImages: boolean;     // Multiple gallery images
  enableRoomManagement: boolean;     // Room types in hotel form
  enableAmenities: boolean;          // Amenities selection
  enableGoogleMaps: boolean;         // Google Maps integration
  enableS3Storage: boolean;          // S3 file storage
  enableEmailNotifications: boolean; // Email notifications
  enableAuditLog: boolean;           // Audit logging
  maintenanceMode: boolean;          // Maintenance mode
}

// ============================================
// HOTEL SETTINGS
// ============================================
export interface HotelSettings {
  amenities: AmenityOption[];        // Available amenities
  starRatings: number[];             // Available star ratings
  bedTypes: BedTypeOption[];         // Available bed types
  defaultCheckInTime: string;        // Default check-in time
  defaultCheckOutTime: string;       // Default check-out time
  maxGalleryImages: number;          // Max images per hotel
  maxRoomTypes: number;              // Max room types per hotel
}

export interface AmenityOption {
  id: string;
  label: string;
  icon?: string;
  category?: string;
}

export interface BedTypeOption {
  value: string;
  label: string;
}

// ============================================
// UPLOAD SETTINGS
// ============================================
export interface UploadSettings {
  maxFileSize: number;               // Max file size in bytes
  maxFileSizeMB: number;             // Max file size in MB (for display)
  allowedImageTypes: string[];       // Allowed MIME types for images
  allowedDocumentTypes: string[];    // Allowed MIME types for documents
  imageQuality: number;              // Image compression quality (1-100)
  thumbnailSize: { width: number; height: number };
  folders: {
    hotels: string;
    rooms: string;
    avatars: string;
    documents: string;
    general: string;
  };
}

// ============================================
// VALIDATION RULES
// ============================================
export interface ValidationRules {
  hotel: {
    nameMinLength: number;
    nameMaxLength: number;
    slugMaxLength: number;
    addressMaxLength: number;
    cityMaxLength: number;
    stateMaxLength: number;
    countryMaxLength: number;
    postalCodeMaxLength: number;
    phoneMaxLength: number;
    emailMaxLength: number;
    websiteMaxLength: number;
    descriptionMaxLength: number;
  };
  room: {
    nameMinLength: number;
    nameMaxLength: number;
    maxOccupancy: number;
    maxPrice: number;
  };
  user: {
    nameMinLength: number;
    nameMaxLength: number;
    passwordMinLength: number;
    passwordMaxLength: number;
  };
}

// ============================================
// PAGINATION SETTINGS
// ============================================
export interface PaginationSettings {
  defaultPage: number;
  defaultLimit: number;
  maxLimit: number;
  allowedLimits: number[];
}

// ============================================
// CACHE SETTINGS
// ============================================
export interface CacheSettings {
  enabled: boolean;
  ttl: number;                       // Time to live in seconds
  maxItems: number;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================
export const getAppConfig = (): AppConfig => ({
  // --------------------------------------------
  // APP SETTINGS
  // --------------------------------------------
  app: {
    name: getEnvironmentData('APP_NAME') || 'DestaPay',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    baseUrl: process.env.APP_URL || 'http://localhost:3002',
    apiPrefix: process.env.APP_PREFIX || 'api',
    timezone: process.env.APP_TIMEZONE || 'UTC',
    dateFormat: process.env.DATE_FORMAT || 'YYYY-MM-DD',
    currency: {
      code: process.env.CURRENCY_CODE || 'USD',
      symbol: process.env.CURRENCY_SYMBOL || '$',
      position: (process.env.CURRENCY_POSITION as 'before' | 'after') || 'before',
      decimalPlaces: parseInt(process.env.CURRENCY_DECIMALS || '2', 10),
    },
  },

  // --------------------------------------------
  // FEATURE FLAGS
  // - Change these to enable/disable features
  // --------------------------------------------
  features: {
    enableSmartImport: process.env.FEATURE_SMART_IMPORT !== 'false',
    enableMultipleImages: process.env.FEATURE_MULTIPLE_IMAGES !== 'false',
    enableRoomManagement: process.env.FEATURE_ROOM_MANAGEMENT !== 'false',
    enableAmenities: process.env.FEATURE_AMENITIES !== 'false',
    enableGoogleMaps: process.env.FEATURE_GOOGLE_MAPS === 'true',
    enableS3Storage: process.env.STORAGE_PROVIDER === 's3',
    enableEmailNotifications: process.env.FEATURE_EMAIL_NOTIFICATIONS === 'true',
    enableAuditLog: process.env.FEATURE_AUDIT_LOG === 'true',
    maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
  },

  // --------------------------------------------
  // HOTEL SETTINGS
  // - Amenities, bed types, ratings, etc.
  // --------------------------------------------
  hotels: {
    amenities: [
      { id: 'all-inclusive', label: 'All-Inclusive', category: 'dining' },
      { id: 'beachfront', label: 'Beachfront', category: 'location' },
      { id: 'swim-up-bars', label: 'Swim-up Bars', category: 'amenities' },
      { id: 'luxury-spa', label: 'Luxury Spa', category: 'wellness' },
      { id: 'adults-only', label: 'Adults Only', category: 'type' },
      { id: 'family-friendly', label: 'Family Friendly', category: 'type' },
      { id: 'convention-center', label: 'Convention Center', category: 'business' },
      { id: 'golf-course', label: 'Golf Course', category: 'recreation' },
      { id: 'fitness-center', label: 'Fitness Center', category: 'wellness' },
      { id: 'free-wifi', label: 'Free WiFi', category: 'amenities' },
      { id: 'airport-shuttle', label: 'Airport Shuttle', category: 'transportation' },
      { id: 'pet-friendly', label: 'Pet Friendly', category: 'type' },
      { id: 'ocean-view', label: 'Ocean View', category: 'location' },
      { id: 'private-beach', label: 'Private Beach', category: 'location' },
      { id: 'casino', label: 'Casino', category: 'entertainment' },
      { id: 'kids-club', label: 'Kids Club', category: 'family' },
    ],
    starRatings: [1, 2, 3, 4, 5],
    bedTypes: [
      { value: 'king', label: 'King' },
      { value: 'queen', label: 'Queen' },
      { value: 'double', label: 'Double' },
      { value: 'twin', label: 'Twin' },
      { value: 'single', label: 'Single' },
      { value: 'other', label: 'Other' },
    ],
    defaultCheckInTime: '14:00:00',
    defaultCheckOutTime: '11:00:00',
    maxGalleryImages: 20,
    maxRoomTypes: 50,
  },

  // --------------------------------------------
  // UPLOAD SETTINGS
  // --------------------------------------------
  uploads: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    maxFileSizeMB: 10,
    allowedImageTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ],
    allowedDocumentTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    imageQuality: 85,
    thumbnailSize: { width: 300, height: 300 },
    folders: {
      hotels: 'hotels',
      rooms: 'rooms',
      avatars: 'avatars',
      documents: 'documents',
      general: 'general',
    },
  },

  // --------------------------------------------
  // VALIDATION RULES
  // - Change these to adjust field limits
  // --------------------------------------------
  validation: {
    hotel: {
      nameMinLength: 2,
      nameMaxLength: 255,
      slugMaxLength: 255,
      addressMaxLength: 255,
      cityMaxLength: 100,
      stateMaxLength: 100,
      countryMaxLength: 100,
      postalCodeMaxLength: 20,
      phoneMaxLength: 20,
      emailMaxLength: 255,
      websiteMaxLength: 255,
      descriptionMaxLength: 10000,
    },
    room: {
      nameMinLength: 2,
      nameMaxLength: 255,
      maxOccupancy: 20,
      maxPrice: 100000,
    },
    user: {
      nameMinLength: 2,
      nameMaxLength: 100,
      passwordMinLength: 8,
      passwordMaxLength: 50,
    },
  },

  // --------------------------------------------
  // PAGINATION SETTINGS
  // --------------------------------------------
  pagination: {
    defaultPage: 1,
    defaultLimit: 10,
    maxLimit: 100,
    allowedLimits: [10, 25, 50, 100],
  },

  // --------------------------------------------
  // CACHE SETTINGS
  // --------------------------------------------
  cache: {
    enabled: process.env.CACHE_ENABLED === 'true',
    ttl: parseInt(process.env.CACHE_TTL || '3600', 10), // 1 hour
    maxItems: parseInt(process.env.CACHE_MAX_ITEMS || '1000', 10),
  },
});

// Export singleton config
export const appConfig = getAppConfig();
