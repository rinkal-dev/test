/**
 * ============================================
 * BOOKING WIZARD CONTROLLER
 * ============================================
 *
 * Public endpoints for the guest booking wizard.
 * No authentication required - used by guests for booking flow.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { Response } from 'express';
import { BookingWizardService } from './booking-wizard.service';
import { InventoryHoldService } from './inventory-hold.service';
import { CreatePublicBookingDto } from './dto/create-booking.dto';
import { response } from 'src/swagger/Base';
import { StripeService } from '../payments/stripe.service';
import { Payments } from '../../../models/Payments';
import { Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiTags('Public - Booking Wizard')
@Controller({ version: '1', path: 'public/booking-wizard' })
export class BookingWizardController {
  constructor(
    private readonly bookingWizardService: BookingWizardService,
    private readonly inventoryHoldService: InventoryHoldService,
    private readonly stripeService: StripeService,
    @Inject('PAYMENTS_REPOSITORY')
    private paymentsRepository: typeof Payments,
  ) {}

  /**
   * GET /api/v1/public/booking-wizard/stripe-config
   * Get Stripe publishable key for frontend
   */
  @ApiOperation({
    operationId: 'get-stripe-config',
    summary: 'Get Stripe configuration',
    description: 'Returns Stripe publishable key for frontend payment form.',
  })
  @ApiOkResponse({
    description: 'Stripe configuration retrieved',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            publishable_key: { type: 'string' },
          },
        },
      },
    },
  })
  @Get('/stripe-config')
  async getStripeConfig(@Res() res: Response) {
    return res.status(HttpStatus.OK).json({
      message: 'Stripe configuration retrieved',
      data: {
        publishable_key: this.stripeService.getPublishableKey(),
      },
    });
  }

  /**
   * BW-001: GET /api/v1/public/booking-wizard/:slug/check-dates
   * Check if dates are available for booking
   */
  @ApiOperation({
    operationId: 'check-date-availability',
    summary: 'Check date availability for booking',
    description:
      'Validates that the requested check-in and check-out dates are within the booking window, meet minimum stay requirements, and the wedding is accepting bookings.',
  })
  @ApiOkResponse({
    description: 'Date availability check completed',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            is_available: { type: 'boolean' },
            booking_window: {
              type: 'object',
              properties: {
                start: { type: 'string' },
                end: { type: 'string' },
              },
            },
            event_dates: {
              type: 'object',
              properties: {
                start: { type: 'string' },
                end: { type: 'string' },
              },
            },
            requested_dates: {
              type: 'object',
              properties: {
                check_in: { type: 'string' },
                check_out: { type: 'string' },
                nights: { type: 'number' },
              },
            },
            validation: {
              type: 'object',
              properties: {
                within_booking_window: { type: 'boolean' },
                check_in_before_event: { type: 'boolean' },
                check_out_valid: { type: 'boolean' },
                min_nights_met: { type: 'boolean' },
                max_nights_met: { type: 'boolean' },
                booking_is_open: { type: 'boolean' },
              },
            },
            errors: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Wedding not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid date parameters',
  })
  @ApiParam({
    name: 'slug',
    type: String,
    description: 'The booking link/slug of the wedding (e.g., "nick-sarah")',
  })
  @ApiQuery({
    name: 'check_in',
    type: String,
    description: 'Check-in date (YYYY-MM-DD)',
    example: '2026-03-01',
  })
  @ApiQuery({
    name: 'check_out',
    type: String,
    description: 'Check-out date (YYYY-MM-DD)',
    example: '2026-03-05',
  })
  @Get('/:slug/check-dates')
  async checkDateAvailability(
    @Param('slug') slug: string,
    @Query('check_in') checkIn: string,
    @Query('check_out') checkOut: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      // Validate required query params
      if (!checkIn || !checkOut) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'check_in and check_out query parameters are required',
        });
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(checkIn) || !dateRegex.test(checkOut)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Dates must be in YYYY-MM-DD format',
        });
      }

      const result = await this.bookingWizardService.checkDateAvailability(
        slug,
        checkIn,
        checkOut,
      );

      if (!result) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Wedding not found',
        });
      }

      return res.status(HttpStatus.OK).json({
        message: result.is_available
          ? 'Dates are available for booking'
          : 'Dates are not available for booking',
        data: result,
      });
    } catch (error) {
      console.error('Error checking date availability:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * BW-015: GET /api/v1/public/booking-wizard/:slug/check-guest
   * Check if guest exists and has password
   */
  @ApiOperation({
    operationId: 'check-guest-status',
    summary: 'Check if guest exists and has password',
    description:
      'Checks if a guest with the given email already exists for this wedding and whether they have set a password.',
  })
  @ApiOkResponse({
    description: 'Guest status retrieved',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            exists: { type: 'boolean' },
            has_password: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Wedding not found',
  })
  @ApiParam({
    name: 'slug',
    type: String,
    description: 'The booking link/slug of the wedding',
  })
  @ApiQuery({
    name: 'email',
    type: String,
    description: 'Guest email address',
    example: 'guest@example.com',
  })
  @Get('/:slug/check-guest')
  async checkGuestStatus(
    @Param('slug') slug: string,
    @Query('email') email: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      if (!email) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Email is required',
        });
      }

      const result = await this.bookingWizardService.checkGuestStatus(slug, email);

      if (result === null) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Wedding not found',
        });
      }

      return res.status(HttpStatus.OK).json({
        message: 'Guest status retrieved',
        data: result,
      });
    } catch (error) {
      console.error('Error checking guest status:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * BW-002: GET /api/v1/public/booking-wizard/:slug/rooms
   * Get available rooms for specific dates
   */
  @ApiOperation({
    operationId: 'get-room-availability',
    summary: 'Get available rooms for dates',
    description:
      'Returns all room types available for the specified dates, including real-time inventory and pricing.',
  })
  @ApiOkResponse({
    description: 'Room availability retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            wedding_uuid: { type: 'string' },
            wedding_name: { type: 'string' },
            check_in: { type: 'string' },
            check_out: { type: 'string' },
            nights: { type: 'number' },
            rooms: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  block_uuid: { type: 'string' },
                  rooms_allocated: { type: 'number' },
                  rooms_booked: { type: 'number' },
                  rooms_available: { type: 'number' },
                  is_available: { type: 'boolean' },
                  price_per_night: { type: 'number' },
                  total_price: { type: 'number' },
                  room_type: { type: 'object' },
                },
              },
            },
            summary: {
              type: 'object',
              properties: {
                total_room_types: { type: 'number' },
                available_room_types: { type: 'number' },
                total_rooms_available: { type: 'number' },
              },
            },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Wedding not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid date parameters',
  })
  @ApiParam({
    name: 'slug',
    type: String,
    description: 'The booking link/slug of the wedding',
  })
  @ApiQuery({
    name: 'check_in',
    type: String,
    description: 'Check-in date (YYYY-MM-DD)',
    example: '2026-03-01',
  })
  @ApiQuery({
    name: 'check_out',
    type: String,
    description: 'Check-out date (YYYY-MM-DD)',
    example: '2026-03-05',
  })
  @Get('/:slug/rooms')
  async getRoomAvailability(
    @Param('slug') slug: string,
    @Query('check_in') checkIn: string,
    @Query('check_out') checkOut: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      // Validate required query params
      if (!checkIn || !checkOut) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'check_in and check_out query parameters are required',
        });
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(checkIn) || !dateRegex.test(checkOut)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Dates must be in YYYY-MM-DD format',
        });
      }

      const result = await this.bookingWizardService.getRoomAvailability(
        slug,
        checkIn,
        checkOut,
      );

      if (!result) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Wedding not found',
        });
      }

      return res.status(HttpStatus.OK).json({
        message: 'Room availability retrieved successfully',
        data: result,
      });
    } catch (error) {
      console.error('Error fetching room availability:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * BW-013: POST /api/v1/public/booking-wizard/:slug/calculate-price
   * Calculate price breakdown for selected rooms and addons
   */
  @ApiOperation({
    operationId: 'calculate-price-breakdown',
    summary: 'Calculate price breakdown',
    description:
      'Returns detailed price breakdown including rooms, addons, deposit, and payment schedule.',
  })
  @ApiOkResponse({
    description: 'Price breakdown calculated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            wedding_uuid: { type: 'string' },
            check_in: { type: 'string' },
            check_out: { type: 'string' },
            nights: { type: 'number' },
            line_items: { type: 'object' },
            pricing: { type: 'object' },
            payment_schedule: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Wedding not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid request body',
  })
  @ApiParam({
    name: 'slug',
    type: String,
    description: 'The booking link/slug of the wedding',
  })
  @Post('/:slug/calculate-price')
  async calculatePriceBreakdown(
    @Param('slug') slug: string,
    @Body()
    body: {
      check_in: string;
      check_out: string;
      rooms: Array<{ block_uuid: string; quantity: number }>;
      addons?: Array<{ addon_uuid: string; quantity: number }>;
    },
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      // Validate required fields
      if (!body.check_in || !body.check_out || !body.rooms || body.rooms.length === 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'check_in, check_out, and rooms are required',
        });
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(body.check_in) || !dateRegex.test(body.check_out)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Dates must be in YYYY-MM-DD format',
        });
      }

      const result = await this.bookingWizardService.calculatePriceBreakdown(
        slug,
        body.check_in,
        body.check_out,
        body.rooms,
        body.addons,
      );

      if (!result) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Wedding not found',
        });
      }

      return res.status(HttpStatus.OK).json({
        message: 'Price breakdown calculated successfully',
        data: result,
      });
    } catch (error) {
      console.error('Error calculating price breakdown:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * BW-014: GET /api/v1/public/booking-wizard/:slug/deposit
   * Get deposit configuration and calculation
   */
  @ApiOperation({
    operationId: 'get-deposit-info',
    summary: 'Get deposit information',
    description:
      'Returns deposit configuration and optionally calculates deposit for a given total amount.',
  })
  @ApiOkResponse({
    description: 'Deposit information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            wedding_uuid: { type: 'string' },
            deposit_config: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                value: { type: 'number' },
                description: { type: 'string' },
              },
            },
            final_payment_due_days: { type: 'number' },
            balance_due_date: { type: 'string' },
            calculated: {
              type: 'object',
              nullable: true,
              properties: {
                total_amount: { type: 'number' },
                deposit_amount: { type: 'number' },
                balance_amount: { type: 'number' },
              },
            },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Wedding not found',
  })
  @ApiParam({
    name: 'slug',
    type: String,
    description: 'The booking link/slug of the wedding',
  })
  @ApiQuery({
    name: 'total',
    type: Number,
    required: false,
    description: 'Optional total amount to calculate deposit for',
    example: 1500,
  })
  @Get('/:slug/deposit')
  async getDepositInfo(
    @Param('slug') slug: string,
    @Query('total') total: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const totalAmount = total ? parseFloat(total) : undefined;

      const result = await this.bookingWizardService.getDepositInfo(
        slug,
        totalAmount,
      );

      if (!result) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Wedding not found',
        });
      }

      return res.status(HttpStatus.OK).json({
        message: 'Deposit information retrieved successfully',
        data: result,
      });
    } catch (error) {
      console.error('Error fetching deposit info:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * BW-008: GET /api/v1/public/booking-wizard/:slug/addons
   * Get available addons for the wedding group
   */
  @ApiOperation({
    operationId: 'get-available-addons',
    summary: 'Get available addons',
    description:
      'Returns all available addons (activities, transportation, etc.) for the wedding group.',
  })
  @ApiOkResponse({
    description: 'Addons retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            wedding_uuid: { type: 'string' },
            addons: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  uuid: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  addon_type: { type: 'string' },
                  price: { type: 'number' },
                  pricing_type: { type: 'string', enum: ['per_stay', 'per_night', 'per_guest', 'per_guest_per_night'] },
                  max_quantity: { type: 'number' },
                  image_url: { type: 'string' },
                },
              },
            },
            summary: {
              type: 'object',
              properties: {
                total_addons: { type: 'number' },
                by_type: { type: 'object' },
              },
            },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Wedding not found',
  })
  @ApiParam({
    name: 'slug',
    type: String,
    description: 'The booking link/slug of the wedding',
  })
  @Get('/:slug/addons')
  async getAvailableAddons(
    @Param('slug') slug: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const result = await this.bookingWizardService.getAvailableAddons(slug);

      if (!result) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Wedding not found',
        });
      }

      return res.status(HttpStatus.OK).json({
        message: 'Addons retrieved successfully',
        data: result,
      });
    } catch (error) {
      console.error('Error fetching addons:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * BW-030: POST /api/v1/public/booking-wizard/:slug/create-payment-intent
   * Create a Stripe PaymentIntent for booking payment
   */
  @ApiOperation({
    operationId: 'create-booking-payment-intent',
    summary: 'Create payment intent for booking',
    description:
      'Creates a Stripe PaymentIntent for the deposit payment. Returns client_secret for frontend payment form.',
  })
  @ApiOkResponse({
    description: 'PaymentIntent created successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            client_secret: { type: 'string' },
            payment_intent_id: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Wedding not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid request',
  })
  @ApiParam({
    name: 'slug',
    type: String,
    description: 'The booking link/slug of the wedding',
  })
  @Post('/:slug/create-payment-intent')
  async createPaymentIntent(
    @Param('slug') slug: string,
    @Body()
    body: {
      check_in: string;
      check_out: string;
      rooms: Array<{ block_uuid: string; quantity: number }>;
      addons?: Array<{ addon_uuid: string; quantity: number }>;
      guest: {
        name: string;
        email: string;
      };
      total_adults?: number;
      total_children?: number;
    },
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      // Validate required fields
      if (!body.check_in || !body.check_out || !body.rooms || body.rooms.length === 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'check_in, check_out, and rooms are required',
        });
      }

      if (!body.guest?.email || !body.guest?.name) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'guest.name and guest.email are required',
        });
      }

      // Calculate price breakdown first (pass guest counts for per_person deposit calculation)
      const priceBreakdown = await this.bookingWizardService.calculatePriceBreakdown(
        slug,
        body.check_in,
        body.check_out,
        body.rooms,
        body.addons,
        body.total_adults,
        body.total_children,
      );

      if (!priceBreakdown) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Wedding not found',
        });
      }

      // Get deposit amount (this is what we charge now)
      const depositAmount = priceBreakdown.pricing.deposit.amount;
      // Get currency from wedding group (defaults to USD if not set)
      const currency = priceBreakdown.pricing.currency || 'USD';

      if (depositAmount <= 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Invalid deposit amount',
        });
      }

      // Create a temporary booking reference for the payment intent
      const tempBookingRef = `TEMP-${Date.now().toString(36).toUpperCase()}`;

      // Create Stripe PaymentIntent
      const paymentIntent = await this.stripeService.createPaymentIntent({
        amount: depositAmount,
        currency: currency.toLowerCase(),
        bookingUuid: tempBookingRef, // Will be updated when booking is created
        bookingReference: tempBookingRef,
        customerEmail: body.guest.email,
        customerName: body.guest.name,
        paymentType: 'deposit',
        description: `Deposit payment for ${priceBreakdown.wedding_name}`,
        metadata: {
          wedding_slug: slug,
          check_in: body.check_in,
          check_out: body.check_out,
          total_amount: priceBreakdown.pricing.subtotal.toString(),
        },
      });

      // Create a pending payment record (will be linked to booking when booking is created)
      const payment = await this.paymentsRepository.create({
        uuid: uuidv4(),
        booking_id: null, // Will be linked when booking is created
        payment_type: 'deposit',
        payment_gateway: 'stripe',
        amount: depositAmount,
        currency: currency,
        payment_intent_id: paymentIntent.id,
        status: 'pending',
        metadata: {
          customer_email: body.guest.email,
          customer_name: body.guest.name,
          wedding_slug: slug,
          temp_booking_ref: tempBookingRef,
        },
      });

      console.log(`Created payment ${payment.uuid} with PaymentIntent ${paymentIntent.id}`);

      return res.status(HttpStatus.OK).json({
        message: 'PaymentIntent created successfully',
        data: {
          payment_uuid: payment.uuid,
          client_secret: paymentIntent.client_secret,
          payment_intent_id: paymentIntent.id,
          amount: depositAmount,
          currency: currency,
          pricing: priceBreakdown.pricing,
        },
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * BW-032: GET /api/v1/public/booking-wizard/bookings/:uuid
   * Get booking details by UUID
   */
  @ApiOperation({
    operationId: 'get-booking-details',
    summary: 'Get booking details',
    description:
      'Returns detailed booking information including rooms, addons, payments, and invoices.',
  })
  @ApiOkResponse({
    description: 'Booking details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: { type: 'object' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Booking not found',
  })
  @ApiParam({
    name: 'uuid',
    type: String,
    description: 'The UUID of the booking',
  })
  @Get('/bookings/:uuid')
  async getBookingDetails(
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const booking = await this.bookingWizardService.getBookingDetails(uuid);

      if (!booking) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Booking not found',
        });
      }

      return res.status(HttpStatus.OK).json({
        message: 'Booking details retrieved successfully',
        data: booking,
      });
    } catch (error) {
      console.error('Error fetching booking details:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * BW-031: POST /api/v1/public/booking-wizard/:slug/book
   * Create a booking from the public wizard
   */
  @ApiOperation({
    operationId: 'create-public-booking',
    summary: 'Create a booking',
    description:
      'Creates a new booking with rooms, addons, and guest information. Returns booking reference and guest access token.',
  })
  @ApiOkResponse({
    description: 'Booking created successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            booking_uuid: { type: 'string' },
            booking_reference: { type: 'string' },
            guest_uuid: { type: 'string' },
            guest_access_token: { type: 'string' },
            status: { type: 'string' },
            check_in: { type: 'string' },
            check_out: { type: 'string' },
            nights: { type: 'number' },
            total_rooms: { type: 'number' },
            total_amount: { type: 'number' },
            deposit_amount: { type: 'number' },
            balance_amount: { type: 'number' },
            currency: { type: 'string' },
            payment_schedule: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Wedding not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid request or insufficient inventory',
  })
  @ApiParam({
    name: 'slug',
    type: String,
    description: 'The booking link/slug of the wedding',
  })
  @Post('/:slug/book')
  async createBooking(
    @Param('slug') slug: string,
    @Body() body: CreatePublicBookingDto,
    @Headers('x-timezone') guestTimezone: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(body.check_in) || !dateRegex.test(body.check_out)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Dates must be in YYYY-MM-DD format',
        });
      }

      // Capture guest timezone from header if not provided in body
      if (!body.guest_timezone && guestTimezone) {
        body.guest_timezone = guestTimezone;
      }

      const result = await this.bookingWizardService.createBooking(slug, body);

      if (!result) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Wedding not found',
        });
      }

      // Handle specific errors
      if (result.error) {
        const errorMessages: Record<string, string> = {
          wedding_not_found: 'Wedding not found',
          wedding_not_active: 'This wedding is not currently accepting bookings',
          invalid_room_block: `Invalid room block: ${result.block_uuid}`,
          insufficient_inventory: `Not enough rooms available. Requested: ${result.requested}, Available: ${result.available}`,
          invalid_addon: `Invalid addon: ${result.addon_uuid}`,
        };

        return res.status(HttpStatus.BAD_REQUEST).json({
          message: errorMessages[result.error] || result.error,
          error: result.error,
        });
      }

      return res.status(HttpStatus.CREATED).json({
        message: 'Booking created successfully',
        data: result,
      });
    } catch (error) {
      console.error('Error creating booking:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ============================================
  // INVENTORY HOLD ENDPOINTS (BW-027, BW-028)
  // ============================================

  /**
   * BW-027: POST /api/v1/public/booking-wizard/:slug/holds
   * Create inventory holds for rooms during checkout
   */
  @ApiOperation({
    operationId: 'create-inventory-hold',
    summary: 'Create inventory hold for checkout',
    description:
      'Creates a temporary hold on rooms while guest completes checkout. Holds expire after 30 minutes.',
  })
  @ApiOkResponse({
    description: 'Hold created successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            holds: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  uuid: { type: 'string' },
                  room_block_id: { type: 'number' },
                  quantity: { type: 'number' },
                  expires_at: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Insufficient inventory or invalid request',
  })
  @ApiParam({
    name: 'slug',
    type: String,
    description: 'The booking link/slug of the wedding',
  })
  @Post('/:slug/holds')
  async createInventoryHold(
    @Param('slug') slug: string,
    @Body()
    body: {
      session_id: string;
      check_in: string;
      check_out: string;
      rooms: Array<{ block_uuid: string; quantity: number }>;
    },
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      // Validate required fields
      if (!body.session_id || !body.check_in || !body.check_out || !body.rooms?.length) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'session_id, check_in, check_out, and rooms are required',
        });
      }

      // Get room availability (which includes room blocks with IDs)
      const roomAvailability = await this.bookingWizardService.getRoomAvailability(
        slug,
        body.check_in,
        body.check_out,
        body.session_id,
      );

      if (!roomAvailability) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Wedding not found',
        });
      }

      // Map block_uuid to block_id using the room availability data
      const roomsWithIds: Array<{ roomBlockId: number; quantity: number }> = [];
      for (const roomRequest of body.rooms) {
        const roomBlock = roomAvailability.rooms.find(
          (r: any) => r.block_uuid === roomRequest.block_uuid,
        );
        if (!roomBlock) {
          return res.status(HttpStatus.BAD_REQUEST).json({
            message: `Invalid room block UUID: ${roomRequest.block_uuid}`,
          });
        }
        roomsWithIds.push({
          roomBlockId: (roomBlock as any).block_id,
          quantity: roomRequest.quantity,
        });
      }

      // Create holds for each room
      const result = await this.inventoryHoldService.createHoldsForBooking(
        (roomAvailability as any).wedding_id || 0,
        body.session_id,
        body.check_in,
        body.check_out,
        roomsWithIds,
      );

      if (!result.success) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Failed to create holds',
          errors: result.errors,
        });
      }

      return res.status(HttpStatus.OK).json({
        message: 'Inventory held successfully',
        data: {
          success: true,
          holds: result.holds?.map(h => ({
            uuid: h.uuid,
            room_block_id: h.room_block_id,
            quantity: h.quantity,
            expires_at: h.expires_at,
          })),
          expires_in_minutes: 30,
        },
      });
    } catch (error) {
      console.error('Error creating inventory hold:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * BW-028: DELETE /api/v1/public/booking-wizard/:slug/holds/:sessionId
   * Release inventory holds for a session
   */
  @ApiOperation({
    operationId: 'release-inventory-holds',
    summary: 'Release inventory holds',
    description: 'Releases all active holds for a checkout session (user cancelled/abandoned).',
  })
  @ApiOkResponse({
    description: 'Holds released successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            released_count: { type: 'number' },
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
  @ApiParam({
    name: 'sessionId',
    type: String,
    description: 'The guest session ID',
  })
  @ApiQuery({
    name: 'reason',
    type: String,
    required: false,
    description: 'Reason for releasing holds',
    example: 'User cancelled checkout',
  })
  @Get('/:slug/holds/:sessionId/release')
  async releaseInventoryHolds(
    @Param('slug') slug: string,
    @Param('sessionId') sessionId: string,
    @Query('reason') reason: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const released = await this.inventoryHoldService.releaseSessionHolds(
        sessionId,
        reason || 'User released holds',
      );

      return res.status(HttpStatus.OK).json({
        message: `Released ${released} hold(s)`,
        data: {
          released_count: released,
        },
      });
    } catch (error) {
      console.error('Error releasing holds:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * GET /api/v1/public/booking-wizard/:slug/holds/:sessionId
   * Get active holds for a session
   */
  @ApiOperation({
    operationId: 'get-session-holds',
    summary: 'Get active holds for session',
    description: 'Returns all active inventory holds for a checkout session.',
  })
  @ApiOkResponse({
    description: 'Holds retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            holds: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
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
  @ApiParam({
    name: 'sessionId',
    type: String,
    description: 'The guest session ID',
  })
  @Get('/:slug/holds/:sessionId')
  async getSessionHolds(
    @Param('slug') slug: string,
    @Param('sessionId') sessionId: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const holds = await this.inventoryHoldService.getSessionHolds(sessionId);

      return res.status(HttpStatus.OK).json({
        message: 'Holds retrieved successfully',
        data: {
          holds: holds.map(h => ({
            uuid: h.uuid,
            room_block_id: h.room_block_id,
            quantity: h.quantity,
            status: h.status,
            check_in_date: h.check_in_date,
            check_out_date: h.check_out_date,
            expires_at: h.expires_at,
            is_valid: new Date(h.expires_at) > new Date(),
          })),
          total_holds: holds.length,
        },
      });
    } catch (error) {
      console.error('Error fetching holds:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * POST /api/v1/public/booking-wizard/:slug/holds/:sessionId/extend
   * Extend hold expiration
   */
  @ApiOperation({
    operationId: 'extend-hold',
    summary: 'Extend hold expiration',
    description: 'Extends the expiration time for holds (e.g., user is still active on checkout page).',
  })
  @ApiOkResponse({
    description: 'Holds extended successfully',
  })
  @ApiParam({
    name: 'slug',
    type: String,
    description: 'The booking link/slug of the wedding',
  })
  @ApiParam({
    name: 'sessionId',
    type: String,
    description: 'The guest session ID',
  })
  @Post('/:slug/holds/:sessionId/extend')
  async extendHolds(
    @Param('slug') slug: string,
    @Param('sessionId') sessionId: string,
    @Body() body: { minutes?: number },
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const holds = await this.inventoryHoldService.getSessionHolds(sessionId);
      let extendedCount = 0;

      for (const hold of holds) {
        const success = await this.inventoryHoldService.extendHold(
          hold.uuid,
          body.minutes || 15,
        );
        if (success) extendedCount++;
      }

      return res.status(HttpStatus.OK).json({
        message: `Extended ${extendedCount} hold(s)`,
        data: {
          extended_count: extendedCount,
          extended_by_minutes: body.minutes || 15,
        },
      });
    } catch (error) {
      console.error('Error extending holds:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }
}
