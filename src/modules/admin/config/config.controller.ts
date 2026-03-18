/**
 * Config Controller
 * Provides configuration endpoints for frontend
 */

import {
  Controller,
  Get,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeaders,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AppConfigService } from './config.service';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { headers, response } from 'src/swagger/Base';

@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@ApiHeaders([headers.accept, headers.accept_language])
@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiUnauthorizedResponse(response.unauthorized)
@ApiTags('Configuration')
@Controller({ version: '1', path: 'config' })
export class AppConfigController {
  constructor(private readonly configService: AppConfigService) {}

  // ------------------------------------------------------------- Get Full Config -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-frontend-config',
    summary: 'Get frontend configuration (amenities, features, validation rules, etc.)',
  })
  @ApiOkResponse(response.ok)
  @Get('/')
  async getConfig(@Res() res: Response) {
    try {
      const config = await this.configService.getFrontendConfig();
      return res.status(HttpStatus.OK).json({
        success: true,
        data: config,
      });
    } catch (error) {
      console.error('Error fetching config:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Get Amenities -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-amenities',
    summary: 'Get available amenities list',
  })
  @ApiOkResponse(response.ok)
  @Get('/amenities')
  async getAmenities(@Res() res: Response) {
    try {
      const amenities = await this.configService.getAmenities();
      return res.status(HttpStatus.OK).json({
        success: true,
        data: amenities,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Get Bed Types -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-bed-types',
    summary: 'Get available bed types list',
  })
  @ApiOkResponse(response.ok)
  @Get('/bed-types')
  async getBedTypes(@Res() res: Response) {
    try {
      const bedTypes = this.configService.getBedTypes();
      return res.status(HttpStatus.OK).json({
        success: true,
        data: bedTypes,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Get Feature Flags -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-features',
    summary: 'Get feature flags',
  })
  @ApiOkResponse(response.ok)
  @Get('/features')
  async getFeatures(@Res() res: Response) {
    try {
      const features = this.configService.getFeatureFlags();
      return res.status(HttpStatus.OK).json({
        success: true,
        data: features,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Get Validation Rules -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-validation-rules',
    summary: 'Get validation rules for forms',
  })
  @ApiOkResponse(response.ok)
  @Get('/validation')
  async getValidationRules(@Res() res: Response) {
    try {
      const rules = this.configService.getValidationRules();
      return res.status(HttpStatus.OK).json({
        success: true,
        data: rules,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }
}
