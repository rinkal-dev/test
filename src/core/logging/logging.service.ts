/**
 * ============================================
 * LOGGING SERVICE
 * ============================================
 * Service for reading and querying log files.
 */

import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { LOG_DIRECTORY } from './winston.config';

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  environment?: string;
  stack?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  ip?: string;
  userId?: string;
  duration?: number;
  [key: string]: any;
}

export interface LogQueryParams {
  level?: string;
  date?: string;
  search?: string;
  path?: string;
  page?: number;
  limit?: number;
  type?: 'error' | 'combined' | 'requests';
}

export interface LogStats {
  totalLogs: number;
  byLevel: Record<string, number>;
  byPath: Record<string, number>;
  recentErrors: LogEntry[];
}

@Injectable()
export class LoggingService {
  private logDir = LOG_DIRECTORY;

  /**
   * Get list of available log files
   */
  async getLogFiles(): Promise<{ name: string; size: number; modified: Date }[]> {
    try {
      if (!fs.existsSync(this.logDir)) {
        return [];
      }

      const files = fs.readdirSync(this.logDir);
      return files
        .filter((f) => f.endsWith('.log'))
        .map((f) => {
          const stats = fs.statSync(path.join(this.logDir, f));
          return {
            name: f,
            size: stats.size,
            modified: stats.mtime,
          };
        })
        .sort((a, b) => b.modified.getTime() - a.modified.getTime());
    } catch (error) {
      return [];
    }
  }

  /**
   * Read and parse a log file
   */
  async readLogFile(
    filename: string,
    query: LogQueryParams = {},
  ): Promise<{ logs: LogEntry[]; total: number; page: number; limit: number }> {
    const { level, search, path: pathFilter, page = 1, limit = 100 } = query;

    const filePath = path.join(this.logDir, filename);

    if (!fs.existsSync(filePath)) {
      return { logs: [], total: 0, page, limit };
    }

    const logs: LogEntry[] = [];

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      try {
        const entry = JSON.parse(line) as LogEntry;

        // Apply filters
        if (level && entry.level !== level) continue;
        if (search && !JSON.stringify(entry).toLowerCase().includes(search.toLowerCase())) continue;
        if (pathFilter && entry.path && !entry.path.includes(pathFilter)) continue;

        logs.push(entry);
      } catch {
        // Skip non-JSON lines
      }
    }

    // Reverse to show newest first
    logs.reverse();

    // Paginate
    const total = logs.length;
    const start = (page - 1) * limit;
    const paginatedLogs = logs.slice(start, start + limit);

    return { logs: paginatedLogs, total, page, limit };
  }

  /**
   * Get logs by type and date
   */
  async getLogs(query: LogQueryParams = {}): Promise<{
    logs: LogEntry[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { type = 'error', date } = query;

    // Determine filename
    const dateStr = date || new Date().toISOString().split('T')[0];
    const filename = `${type}-${dateStr}.log`;

    return this.readLogFile(filename, query);
  }

  /**
   * Get error statistics
   */
  async getStats(days: number = 7): Promise<LogStats> {
    const stats: LogStats = {
      totalLogs: 0,
      byLevel: {},
      byPath: {},
      recentErrors: [],
    };

    // Get recent error log files
    const files = await this.getLogFiles();
    const errorFiles = files
      .filter((f) => f.name.startsWith('error-'))
      .slice(0, days);

    for (const file of errorFiles) {
      const { logs } = await this.readLogFile(file.name, { limit: 1000 });

      for (const log of logs) {
        stats.totalLogs++;

        // Count by level
        stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;

        // Count by path
        if (log.path) {
          stats.byPath[log.path] = (stats.byPath[log.path] || 0) + 1;
        }
      }
    }

    // Get recent errors (last 10)
    if (errorFiles.length > 0) {
      const { logs } = await this.readLogFile(errorFiles[0].name, { limit: 10 });
      stats.recentErrors = logs;
    }

    return stats;
  }

  /**
   * Clear old log files (older than specified days)
   */
  async clearOldLogs(daysToKeep: number = 30): Promise<{ deleted: string[] }> {
    const deleted: string[] = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const files = await this.getLogFiles();

    for (const file of files) {
      if (file.modified < cutoffDate) {
        try {
          fs.unlinkSync(path.join(this.logDir, file.name));
          deleted.push(file.name);
        } catch {
          // Ignore deletion errors
        }
      }
    }

    return { deleted };
  }

  /**
   * Download a log file
   */
  getLogFilePath(filename: string): string | null {
    const filePath = path.join(this.logDir, filename);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    return null;
  }
}
