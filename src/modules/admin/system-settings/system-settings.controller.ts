/**
 * System Settings Controller
 *
 * Admin endpoints for managing system configuration.
 * Requires 'settings.view' and 'settings.edit' permissions.
 */

import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SystemSettingsService } from './system-settings.service';
import {
  UpdateSettingDto,
  BulkUpdateSettingsDto,
  SettingsCategoryQueryDto,
} from './dto/UpdateSettingsDto';
import { JwtAdminAuthGuard } from '../../../auth/jwt-admin-auth.guard';

@ApiTags('Admin - System Settings')
@ApiBearerAuth()
@Controller({ version: '1', path: 'admin/system-settings' })
@UseGuards(JwtAdminAuthGuard)
export class SystemSettingsController {
  constructor(private readonly settingsService: SystemSettingsService) {}

  /**
   * Get all settings grouped by category
   */
  @Get()
  @ApiOperation({ summary: 'Get all system settings' })
  @ApiResponse({
    status: 200,
    description: 'Settings retrieved successfully',
  })
  async getAllSettings(@Query() query: SettingsCategoryQueryDto) {
    const settings = await this.settingsService.getAllSettings();

    // Filter by category if provided
    if (query.category) {
      const filtered = settings.filter((s) => s.category === query.category);
      return {
        message: 'Settings retrieved successfully',
        data: filtered,
      };
    }

    return {
      message: 'Settings retrieved successfully',
      data: settings,
    };
  }

  /**
   * Get a single setting
   */
  @Get(':key')
  @ApiOperation({ summary: 'Get a specific setting' })
  @ApiParam({ name: 'key', description: 'Setting key' })
  @ApiResponse({
    status: 200,
    description: 'Setting retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Setting not found',
  })
  async getSetting(@Param('key') key: string) {
    const setting = await this.settingsService.getSetting(key);

    if (!setting) {
      return {
        statusCode: 404,
        message: 'Setting not found or not allowed',
      };
    }

    return {
      message: 'Setting retrieved successfully',
      data: setting,
    };
  }

  /**
   * Update a single setting
   */
  @Put(':key')
  @ApiOperation({ summary: 'Update a setting' })
  @ApiParam({ name: 'key', description: 'Setting key' })
  @ApiResponse({
    status: 200,
    description: 'Setting updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid setting or value',
  })
  async updateSetting(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
    @Request() req,
  ) {
    const userId = req.user?.id || req.user?.sub;

    const setting = await this.settingsService.updateSetting(
      key,
      dto.value,
      userId,
    );

    return {
      message: 'Setting updated successfully',
      data: setting,
    };
  }

  /**
   * Bulk update multiple settings
   */
  @Put()
  @ApiOperation({ summary: 'Bulk update settings' })
  @ApiResponse({
    status: 200,
    description: 'Settings updated',
  })
  async bulkUpdateSettings(
    @Body() dto: BulkUpdateSettingsDto,
    @Request() req,
  ) {
    const userId = req.user?.id || req.user?.sub;

    const result = await this.settingsService.updateSettings(
      dto.settings,
      userId,
    );

    return {
      message: `Updated ${result.success} settings`,
      data: {
        success: result.success,
        failed: result.failed,
      },
    };
  }

  /**
   * Delete a setting (revert to env/default)
   */
  @Delete(':key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a setting (revert to env/default)' })
  @ApiParam({ name: 'key', description: 'Setting key' })
  @ApiResponse({
    status: 200,
    description: 'Setting deleted',
  })
  async deleteSetting(@Param('key') key: string) {
    const deleted = await this.settingsService.deleteSetting(key);

    return {
      message: deleted
        ? 'Setting deleted, reverted to environment/default value'
        : 'Setting not found',
    };
  }

  /**
   * Refresh settings cache
   */
  @Put('cache/refresh')
  @ApiOperation({ summary: 'Refresh settings cache' })
  @ApiResponse({
    status: 200,
    description: 'Cache refreshed',
  })
  async refreshCache() {
    await this.settingsService.refreshCache();

    return {
      message: 'Settings cache refreshed successfully',
    };
  }

  /**
   * Test email configuration
   */
  @Get('test/email')
  @ApiOperation({ summary: 'Test email configuration' })
  @ApiResponse({
    status: 200,
    description: 'Test result',
  })
  async testEmail() {
    const result = await this.settingsService.testEmailConfig();

    return {
      message: result.message,
      data: {
        success: result.success,
      },
    };
  }
}
