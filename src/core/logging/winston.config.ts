/**
 * ============================================
 * WINSTON LOGGING CONFIGURATION
 * ============================================
 * Centralized logging with file rotation.
 * Logs are stored in /logs directory.
 */

import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { getEnvironmentData } from '../../helpers/general';

const logDir = process.cwd() + '/logs';

// Check if running on Vercel (read-only filesystem)
const isVercel = !!process.env.VERCEL;

// Custom format for log entries
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Console format (colorized for development)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  }),
);

// File transports — only created when NOT on Vercel (read-only filesystem)
let errorFileTransport: winston.transport;
let combinedFileTransport: winston.transport;
let requestFileTransport: winston.transport;

if (!isVercel) {
  // Error file transport (rotated daily)
  errorFileTransport = new winston.transports.DailyRotateFile({
    filename: `${logDir}/error-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '30d',
    format: customFormat,
  });

  // Combined file transport (all logs)
  combinedFileTransport = new winston.transports.DailyRotateFile({
    filename: `${logDir}/combined-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: customFormat,
  });

  // HTTP/API request logs
  requestFileTransport = new winston.transports.DailyRotateFile({
    filename: `${logDir}/requests-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '7d',
    format: customFormat,
  });
}

// Create transports array based on environment
const getTransports = () => {
  // Vercel has a read-only filesystem — use only Console transport
  if (isVercel) {
    return [
      new winston.transports.Console({
        format: customFormat,
      }),
    ];
  }

  const transports: winston.transport[] = [
    errorFileTransport,
    combinedFileTransport,
  ];

  // Add console transport for non-production
  const env = getEnvironmentData('NODE_ENV') || 'development';
  if (env !== 'production') {
    transports.push(
      new winston.transports.Console({
        format: consoleFormat,
      }),
    );
  }

  return transports;
};

// Winston configuration for NestJS
export const winstonConfig = {
  level: getEnvironmentData('LOG_LEVEL') || 'info',
  format: customFormat,
  defaultMeta: {
    environment: getEnvironmentData('NODE_ENV') || 'development',
    app: getEnvironmentData('APP_NAME') || 'destawed-group',
  },
  transports: getTransports(),
};

// Create logger instance for direct use
export const logger = winston.createLogger(winstonConfig);

// Request logger instance
export const requestLogger = winston.createLogger({
  level: 'info',
  format: customFormat,
  defaultMeta: {
    environment: getEnvironmentData('NODE_ENV') || 'development',
    type: 'request',
  },
  transports: isVercel
    ? [new winston.transports.Console({ format: customFormat })]
    : [requestFileTransport],
});

// Export log directory for the viewer
export const LOG_DIRECTORY = logDir;
