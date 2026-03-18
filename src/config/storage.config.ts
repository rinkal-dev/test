/**
 * Storage Configuration
 * Central configuration for file storage - easily switch between local and S3
 */

export enum StorageProvider {
  LOCAL = 'local',
  S3 = 's3',
  SUPABASE = 'supabase',
}

export interface LocalStorageConfig {
  uploadDir: string;        // Directory to store files (e.g., 'uploads')
  baseUrl: string;          // Base URL for accessing files (e.g., 'http://localhost:3002/uploads')
}

export interface S3StorageConfig {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;        // For S3-compatible services like DigitalOcean Spaces
  baseUrl?: string;         // CDN URL if using CloudFront
}

export interface SupabaseStorageConfig {
  url: string;              // Supabase project URL
  anonKey: string;          // Supabase anon/public key
  serviceKey?: string;      // Supabase service role key (for server-side)
  bucket: string;           // Storage bucket name
}

export interface StorageConfig {
  provider: StorageProvider;
  local: LocalStorageConfig;
  s3: S3StorageConfig;
  supabase: SupabaseStorageConfig;
  allowedMimeTypes: string[];
  maxFileSize: number;      // In bytes
}

export const getStorageConfig = (): StorageConfig => {
  return {
    // ============================================
    // CHANGE THIS TO SWITCH STORAGE PROVIDER
    // ============================================
    provider: (process.env.STORAGE_PROVIDER as StorageProvider) || StorageProvider.LOCAL,

    // Local Storage Configuration
    local: {
      uploadDir: process.env.LOCAL_UPLOAD_DIR || 'uploads',
      baseUrl: process.env.LOCAL_UPLOAD_BASE_URL || `${process.env.APP_URL || 'http://localhost:3002'}/uploads`,
    },

    // S3 Storage Configuration
    s3: {
      bucket: process.env.S3_BUCKET || '',
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      endpoint: process.env.S3_ENDPOINT || undefined,
      baseUrl: process.env.S3_BASE_URL || undefined,
    },

    // Supabase Storage Configuration
    supabase: {
      url: process.env.SUPABASE_URL || '',
      anonKey: process.env.SUPABASE_ANON_KEY || '',
      serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
      bucket: process.env.SUPABASE_STORAGE_BUCKET || 'uploads',
    },

    // File Upload Restrictions
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/svg+xml',
      'image/avif',
    ],
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
  };
};

export const storageConfig = getStorageConfig();
