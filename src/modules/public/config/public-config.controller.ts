/**
 * Public Config Controller
 * Provides public configuration endpoints for frontend
 */

import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PublicConfigService } from './public-config.service';

@ApiTags('Public Config')
@Controller({ version: '1', path: 'public/config' })
export class PublicConfigController {
  constructor(private readonly publicConfigService: PublicConfigService) {}

  @Get('google')
  @ApiOperation({ summary: 'Get Google API configuration for frontend' })
  @ApiResponse({ status: 200, description: 'Google config retrieved' })
  getGoogleConfig() {
    return {
      statusCode: HttpStatus.OK,
      message: 'Google config retrieved',
      data: {
        places_api_key: this.publicConfigService.getGooglePlacesApiKey(),
        is_configured: this.publicConfigService.isGooglePlacesConfigured(),
      },
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all public configuration for frontend' })
  @ApiResponse({ status: 200, description: 'Public config retrieved' })
  getAllConfig() {
    return {
      statusCode: HttpStatus.OK,
      message: 'Public config retrieved',
      data: this.publicConfigService.getPublicConfig(),
    };
  }
}
