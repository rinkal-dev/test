/**
 * ============================================
 * GUEST BOOKINGS CONTROLLER
 * ============================================
 *
 * Public endpoints for guest booking management.
 * Includes cancellation preview and refund requests.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { Response, Request } from 'express';
import { GuestBookingsService } from './guest-bookings.service';
import { GuestRefundRequestDto } from './dto/GuestRefundRequestDto';
import { UpdateRoommateOptInDto } from './dto/UpdateRoommateOptInDto';
import { SendRoommateMessageDto } from './dto/SendRoommateMessageDto';
import { JwtGuestGuard } from '../guest-auth/guards/jwt-guest.guard';
import { response } from 'src/swagger/Base';

@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiTags('Public - Guest Bookings')
@Controller({ version: '1', path: 'public/guest-bookings' })
export class GuestBookingsController {
  constructor(private readonly guestBookingsService: GuestBookingsService) {}

  /**
   * GET /api/v1/public/guest-bookings
   * Get all bookings for authenticated guest
   */
  @ApiOperation({
    operationId: 'get-guest-bookings',
    summary: 'Get guest bookings',
    description: 'Returns all bookings for the authenticated guest with payment status.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Bookings retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            bookings: { type: 'array' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing token',
  })
  @UseGuards(JwtGuestGuard)
  @Get()
  async getBookings(
    @Req() req: Request,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const guest = (req as any).guest;
      const bookings = await this.guestBookingsService.getGuestBookings(guest.id);

      return res.status(HttpStatus.OK).json({
        message: 'Bookings retrieved successfully',
        data: { bookings },
      });
    } catch (error) {
      console.error('Error fetching guest bookings:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * GET /api/v1/public/guest-bookings/:bookingUuid/cancellation-preview
   * Preview cancellation - shows refund amount based on policy
   */
  @ApiOperation({
    operationId: 'get-cancellation-preview',
    summary: 'Preview booking cancellation',
    description:
      'Shows the guest what refund amount they would receive if they cancel, based on the cancellation policy.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Cancellation preview retrieved',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            booking_uuid: { type: 'string' },
            booking_reference: { type: 'string' },
            total_paid: { type: 'number' },
            refund_amount: { type: 'number' },
            refund_percentage: { type: 'number' },
            penalty_amount: { type: 'number' },
            days_until_event: { type: 'number' },
            policy_name: { type: 'string' },
            policy_message: { type: 'string' },
            can_request_refund: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiBadRequestResponse({
    description: 'Booking cannot be cancelled',
  })
  @ApiConflictResponse({
    description: 'A refund request is already pending',
  })
  @ApiParam({
    name: 'bookingUuid',
    type: String,
    description: 'UUID of the booking',
  })
  @UseGuards(JwtGuestGuard)
  @Get(':bookingUuid/cancellation-preview')
  async getCancellationPreview(
    @Param('bookingUuid') bookingUuid: string,
    @Req() req: Request,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const guest = (req as any).guest;
      const preview = await this.guestBookingsService.getCancellationPreview(
        guest.id,
        bookingUuid,
      );

      return res.status(HttpStatus.OK).json({
        message: 'Cancellation preview retrieved',
        data: preview,
      });
    } catch (error) {
      console.error('Error getting cancellation preview:', error);

      if (error.status === HttpStatus.NOT_FOUND) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: error.message,
        });
      }
      if (error.status === HttpStatus.BAD_REQUEST) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: error.message,
        });
      }
      if (error.status === HttpStatus.CONFLICT) {
        return res.status(HttpStatus.CONFLICT).json({
          message: error.message,
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * POST /api/v1/public/guest-bookings/request-refund
   * Request a refund for a booking
   */
  @ApiOperation({
    operationId: 'request-refund',
    summary: 'Request booking cancellation and refund',
    description:
      'Submits a refund request for a booking. The request will be reviewed by an admin before processing.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Refund request submitted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            booking_reference: { type: 'string' },
            refund_amount: { type: 'number' },
            refund_percentage: { type: 'number' },
            status: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiBadRequestResponse({
    description: 'Invalid request or booking cannot be cancelled',
  })
  @ApiConflictResponse({
    description: 'A refund request is already pending',
  })
  @UseGuards(JwtGuestGuard)
  @Post('request-refund')
  async requestRefund(
    @Body() dto: GuestRefundRequestDto,
    @Req() req: Request,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const guest = (req as any).guest;
      const result = await this.guestBookingsService.requestRefund(guest.id, dto);

      return res.status(HttpStatus.OK).json({
        message: result.message,
        data: result,
      });
    } catch (error) {
      console.error('Error requesting refund:', error);

      if (error.status === HttpStatus.NOT_FOUND) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: error.message,
        });
      }
      if (error.status === HttpStatus.BAD_REQUEST) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: error.message,
        });
      }
      if (error.status === HttpStatus.CONFLICT) {
        return res.status(HttpStatus.CONFLICT).json({
          message: error.message,
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * GET /api/v1/public/guest-bookings/:bookingUuid/refund-status
   * Get refund status for a booking
   */
  @ApiOperation({
    operationId: 'get-refund-status',
    summary: 'Get refund request status',
    description: 'Returns the status of any refund requests for the specified booking.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Refund status retrieved',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            has_refund_request: { type: 'boolean' },
            refunds: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  uuid: { type: 'string' },
                  amount: { type: 'number' },
                  status: { type: 'string' },
                  created_at: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiParam({
    name: 'bookingUuid',
    type: String,
    description: 'UUID of the booking',
  })
  @UseGuards(JwtGuestGuard)
  @Get(':bookingUuid/refund-status')
  async getRefundStatus(
    @Param('bookingUuid') bookingUuid: string,
    @Req() req: Request,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const guest = (req as any).guest;
      const status = await this.guestBookingsService.getRefundStatus(
        guest.id,
        bookingUuid,
      );

      return res.status(HttpStatus.OK).json({
        message: 'Refund status retrieved',
        data: status,
      });
    } catch (error) {
      console.error('Error getting refund status:', error);

      if (error.status === HttpStatus.NOT_FOUND) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: error.message,
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * PATCH /api/v1/public/guest-bookings/:bookingUuid/roommate-opt-in
   * Update roommate opt-in status for a booking
   */
  @ApiOperation({
    operationId: 'update-roommate-opt-in',
    summary: 'Update solo traveler connection opt-in',
    description:
      'Toggle opt-in status for solo traveler connection (roommate matching). When opted-in, guest info will be shared with other opted-in guests in the same wedding group.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Roommate opt-in status updated',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            roommate_opt_in: { type: 'boolean' },
            roommate_note: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiParam({
    name: 'bookingUuid',
    type: String,
    description: 'UUID of the booking',
  })
  @UseGuards(JwtGuestGuard)
  @Patch(':bookingUuid/roommate-opt-in')
  async updateRoommateOptIn(
    @Param('bookingUuid') bookingUuid: string,
    @Body() dto: UpdateRoommateOptInDto,
    @Req() req: Request,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const guest = (req as any).guest;
      const result = await this.guestBookingsService.updateRoommateOptIn(
        guest.id,
        bookingUuid,
        dto,
      );

      return res.status(HttpStatus.OK).json({
        message: 'Roommate opt-in status updated',
        data: result,
      });
    } catch (error) {
      console.error('Error updating roommate opt-in:', error);

      if (error.status === HttpStatus.NOT_FOUND) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: error.message,
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * GET /api/v1/public/guest-bookings/:bookingUuid/roommate-connections
   * Get list of other opted-in guests in the same wedding group
   */
  @ApiOperation({
    operationId: 'get-roommate-connections',
    summary: 'Get solo traveler connections',
    description:
      'Returns list of other guests who have opted-in to solo traveler connection in the same wedding group. Only available if the current guest has also opted-in.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Roommate connections retrieved',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            is_opted_in: { type: 'boolean' },
            connections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  guest_name: { type: 'string' },
                  guest_email: { type: 'string' },
                  roommate_note: { type: 'string' },
                  check_in: { type: 'string' },
                  check_out: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiParam({
    name: 'bookingUuid',
    type: String,
    description: 'UUID of the booking',
  })
  @UseGuards(JwtGuestGuard)
  @Get(':bookingUuid/roommate-connections')
  async getRoommateConnections(
    @Param('bookingUuid') bookingUuid: string,
    @Req() req: Request,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const guest = (req as any).guest;
      const result = await this.guestBookingsService.getRoommateConnections(
        guest.id,
        bookingUuid,
      );

      return res.status(HttpStatus.OK).json({
        message: 'Roommate connections retrieved',
        data: result,
      });
    } catch (error) {
      console.error('Error getting roommate connections:', error);

      if (error.status === HttpStatus.NOT_FOUND) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: error.message,
        });
      }
      if (error.status === HttpStatus.FORBIDDEN) {
        return res.status(HttpStatus.FORBIDDEN).json({
          message: error.message,
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * POST /api/v1/public/guest-bookings/:bookingUuid/send-roommate-message
   * Send a message to another opted-in guest
   */
  @ApiOperation({
    operationId: 'send-roommate-message',
    summary: 'Send message to another solo traveler',
    description:
      'Send a message to another guest who has opted-in to solo traveler connection. The message is delivered via email, keeping the recipient email private.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Message sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            recipient_name: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiBadRequestResponse({
    description: 'Cannot send message - not opted-in or recipient not found',
  })
  @ApiParam({
    name: 'bookingUuid',
    type: String,
    description: 'UUID of the sender booking',
  })
  @UseGuards(JwtGuestGuard)
  @Post(':bookingUuid/send-roommate-message')
  async sendRoommateMessage(
    @Param('bookingUuid') bookingUuid: string,
    @Body() dto: SendRoommateMessageDto,
    @Req() req: Request,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const guest = (req as any).guest;
      const result = await this.guestBookingsService.sendRoommateMessage(
        guest.id,
        bookingUuid,
        dto,
      );

      return res.status(HttpStatus.OK).json({
        message: 'Message sent successfully',
        data: result,
      });
    } catch (error) {
      console.error('Error sending roommate message:', error);

      if (error.status === HttpStatus.NOT_FOUND) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: error.message,
        });
      }
      if (error.status === HttpStatus.BAD_REQUEST) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: error.message,
        });
      }
      if (error.status === HttpStatus.FORBIDDEN) {
        return res.status(HttpStatus.FORBIDDEN).json({
          message: error.message,
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }
}
