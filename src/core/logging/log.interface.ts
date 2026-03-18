/**
 * ============================================
 * LOG INTERFACE
 * ============================================
 * Defines log entry structure and query parameters.
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

export enum LogEnvironment {
  PRODUCTION = 'production',
  DEVELOPMENT = 'development',
  LOCAL = 'local',
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  environment: LogEnvironment | string;
  message: string;
  stack?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  userId?: string;
  ip?: string;
  userAgent?: string;
  requestBody?: any;
  responseBody?: any;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface LogQueryParams {
  level?: LogLevel;
  environment?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  path?: string;
  page?: number;
  limit?: number;
}

export interface LogStats {
  totalErrors: number;
  totalWarnings: number;
  totalInfo: number;
  errorsByPath: Record<string, number>;
  errorsByDay: Record<string, number>;
}
