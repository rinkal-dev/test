/**
 * ============================================
 * LOGGING CONTROLLER
 * ============================================
 * Admin-only endpoints for viewing application logs.
 * Protected with JWT admin authentication.
 */

import {
  Controller,
  Get,
  Query,
  Param,
  Delete,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAdminAuthGuard } from '../../auth/jwt-admin-auth.guard';
import { LoggingService, LogQueryParams } from './logging.service';

@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@ApiTags('System Logs')
@ApiUnauthorizedResponse({ description: 'Unauthorized - Admin access required' })
@Controller({ version: '1', path: 'admin/logs' })
export class LoggingController {
  constructor(private readonly loggingService: LoggingService) {}

  /**
   * Get list of available log files
   */
  @ApiOperation({
    operationId: 'get-log-files',
    summary: 'Get list of available log files',
  })
  @ApiOkResponse({ description: 'List of log files' })
  @Get('/files')
  async getLogFiles(@Res() res: Response) {
    try {
      const files = await this.loggingService.getLogFiles();
      return res.status(HttpStatus.OK).json({
        message: 'Log files retrieved',
        data: files,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message,
      });
    }
  }

  /**
   * Get logs with filtering
   */
  @ApiOperation({
    operationId: 'get-logs',
    summary: 'Get application logs with filtering',
  })
  @ApiQuery({ name: 'type', required: false, enum: ['error', 'combined', 'requests'] })
  @ApiQuery({ name: 'date', required: false, description: 'Date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'level', required: false, enum: ['error', 'warn', 'info', 'debug'] })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'path', required: false, description: 'Filter by API path' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Logs retrieved successfully' })
  @Get('/')
  async getLogs(@Query() query: LogQueryParams, @Res() res: Response) {
    try {
      const result = await this.loggingService.getLogs(query);
      return res.status(HttpStatus.OK).json({
        message: 'Logs retrieved',
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message,
      });
    }
  }

  /**
   * Get error statistics
   */
  @ApiOperation({
    operationId: 'get-log-stats',
    summary: 'Get error statistics for the last N days',
  })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days (default: 7)' })
  @ApiOkResponse({ description: 'Statistics retrieved' })
  @Get('/stats')
  async getStats(@Query('days') days: number = 7, @Res() res: Response) {
    try {
      const stats = await this.loggingService.getStats(days);
      return res.status(HttpStatus.OK).json({
        message: 'Log statistics retrieved',
        data: stats,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message,
      });
    }
  }

  /**
   * Read specific log file
   */
  @ApiOperation({
    operationId: 'read-log-file',
    summary: 'Read a specific log file',
  })
  @ApiQuery({ name: 'level', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Log file contents' })
  @Get('/file/:filename')
  async readLogFile(
    @Param('filename') filename: string,
    @Query() query: LogQueryParams,
    @Res() res: Response,
  ) {
    try {
      // Prevent path traversal
      if (filename.includes('..') || filename.includes('/')) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Invalid filename',
        });
      }

      const result = await this.loggingService.readLogFile(filename, query);
      return res.status(HttpStatus.OK).json({
        message: 'Log file read successfully',
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message,
      });
    }
  }

  /**
   * Download a log file
   */
  @ApiOperation({
    operationId: 'download-log-file',
    summary: 'Download a log file',
  })
  @Get('/download/:filename')
  async downloadLogFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    try {
      // Prevent path traversal
      if (filename.includes('..') || filename.includes('/')) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Invalid filename',
        });
      }

      const filePath = this.loggingService.getLogFilePath(filename);
      if (!filePath) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Log file not found',
        });
      }

      return res.download(filePath, filename);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message,
      });
    }
  }

  /**
   * Clear old logs
   */
  @ApiOperation({
    operationId: 'clear-old-logs',
    summary: 'Delete log files older than specified days',
  })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Days to keep (default: 30)' })
  @Delete('/clear')
  async clearOldLogs(@Query('days') days: number = 30, @Res() res: Response) {
    try {
      const result = await this.loggingService.clearOldLogs(days);
      return res.status(HttpStatus.OK).json({
        message: `Deleted ${result.deleted.length} old log files`,
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message,
      });
    }
  }
}
