/**
 * ============================================
 * PUBLIC WEDDINGS CONTROLLER
 * ============================================
 *
 * Public endpoints for wedding data access.
 * No authentication required - used by guests for booking pages.
 */

import {
  Controller,
  Get,
  Param,
  Res,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { Response } from 'express';
import { PublicWeddingsService } from './public-weddings.service';
import { response } from 'src/swagger/Base';

@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiTags('Public - Weddings')
@Controller({ version: '1', path: 'public/weddings' })
export class PublicWeddingsController {
  constructor(private readonly publicWeddingsService: PublicWeddingsService) {}

  /**
   * GET /api/v1/public/weddings
   * Get list of public weddings for browsing
   */
  @ApiOperation({
    operationId: 'get-public-weddings-list',
    summary: 'Get list of public weddings',
    description: 'Returns active weddings that are open for booking. Used for the browse/discover page.',
  })
  @ApiOkResponse({
    description: 'List of public weddings',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              uuid: { type: 'string' },
              booking_link: { type: 'string' },
              couple_name: { type: 'string' },
              event_start_date: { type: 'string' },
              hotel_name: { type: 'string' },
              hotel_city: { type: 'string' },
              hotel_country: { type: 'string' },
              image_url: { type: 'string', nullable: true },
              status: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @Get()
  async getPublicWeddingsList(
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const weddings = await this.publicWeddingsService.getPublicWeddingsList();

      return res.status(HttpStatus.OK).json({
        message: 'Public weddings retrieved successfully',
        data: weddings,
      });
    } catch (error) {
      console.error('Error fetching public weddings list:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * GET /api/v1/public/weddings/:slug
   * Get full wedding data for public booking page
   */
  @ApiOperation({
    operationId: 'get-public-wedding-data',
    summary: 'Get public wedding data by booking link (slug)',
    description: 'Returns all wedding details, hotel info, room blocks, addons, itinerary, and cancellation policies needed for the public booking page. No authentication required.',
  })
  @ApiOkResponse({
    description: 'Wedding data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            wedding: { type: 'object' },
            hotel: { type: 'object' },
            room_blocks: { type: 'array' },
            addons: { type: 'array' },
            itinerary: { type: 'array' },
            cancellation_policies: { type: 'array' },
            booking_status: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Wedding not found or not available',
  })
  @ApiParam({
    name: 'slug',
    type: String,
    description: 'The booking link/slug of the wedding (e.g., "john-jane-2026")',
  })
  @Get('/:slug')
  async getWeddingBySlug(
    @Param('slug') slug: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const weddingData = await this.publicWeddingsService.getByBookingLink(slug);

      if (!weddingData) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Wedding not found or not available for booking',
        });
      }

      return res.status(HttpStatus.OK).json({
        message: 'Wedding data retrieved successfully',
        data: weddingData,
      });
    } catch (error) {
      console.error('Error fetching public wedding data:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * GET /api/v1/public/weddings/:slug/preview
   * Get minimal wedding info for preview
   */
  @ApiOperation({
    operationId: 'get-public-wedding-preview',
    summary: 'Get minimal wedding preview info',
    description: 'Returns basic wedding info for quick preview/validation before loading full page.',
  })
  @ApiOkResponse({
    description: 'Preview data retrieved successfully',
  })
  @ApiNotFoundResponse({
    description: 'Wedding not found',
  })
  @ApiParam({
    name: 'slug',
    type: String,
    description: 'The booking link/slug of the wedding',
  })
  @Get('/:slug/preview')
  async getWeddingPreview(
    @Param('slug') slug: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const previewData = await this.publicWeddingsService.getPreviewInfo(slug);

      if (!previewData) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Wedding not found',
        });
      }

      return res.status(HttpStatus.OK).json({
        message: 'Preview data retrieved successfully',
        data: previewData,
      });
    } catch (error) {
      console.error('Error fetching wedding preview:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * GET /api/v1/public/weddings/:slug/validate
   * Check if a booking link is valid and bookings are open
   */
  @ApiOperation({
    operationId: 'validate-wedding-booking-link',
    summary: 'Validate if a wedding booking link is active',
    description: 'Quick check to see if a booking link exists and is accepting bookings.',
  })
  @ApiOkResponse({
    description: 'Validation result',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            is_valid: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiParam({
    name: 'slug',
    type: String,
    description: 'The booking link/slug of the wedding',
  })
  @Get('/:slug/validate')
  async validateBookingLink(
    @Param('slug') slug: string,
    @Res() res: Response,
  ) {
    try {
      const isValid = await this.publicWeddingsService.isValidBookingLink(slug);

      return res.status(HttpStatus.OK).json({
        message: isValid ? 'Booking link is valid' : 'Booking link is not valid or not active',
        data: { is_valid: isValid },
      });
    } catch (error) {
      console.error('Error validating booking link:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Internal server error',
      });
    }
  }
}
