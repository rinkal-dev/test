/**
 * ============================================
 * DATABASE PROVIDER CONFIGURATION
 * ============================================
 *
 * Central configuration for database provider.
 * Switch between Sequelize and Supabase easily.
 *
 * To switch to Supabase:
 * 1. Set DATABASE_PROVIDER=supabase in .env
 * 2. Set SUPABASE_URL and SUPABASE_SERVICE_KEY
 * 3. Restart the server
 */

export enum DatabaseProvider {
  SEQUELIZE = 'sequelize',
  SUPABASE = 'supabase',
}

export interface DatabaseConfig {
  provider: DatabaseProvider;
  sequelize: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    dialect: string;
  };
  supabase: {
    url: string;
    anonKey: string;
    serviceKey: string;
  };
}

export const getDatabaseConfig = (): DatabaseConfig => ({
  // ============================================
  // CHANGE THIS TO SWITCH DATABASE PROVIDER
  // ============================================
  provider: (process.env.DATABASE_PROVIDER as DatabaseProvider) || DatabaseProvider.SEQUELIZE,

  // Sequelize Configuration (Current)
  sequelize: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_DATABASE || 'destapay',
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    dialect: process.env.DB_DIALECT || 'postgres',
  },

  // Supabase Configuration (Future)
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },
});

export const databaseConfig = getDatabaseConfig();
