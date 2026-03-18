/**
 * ============================================
 * GUEST AUTH CONTROLLER
 * ============================================
 *
 * Public endpoints for guest authentication.
 * GP-002: Guest Login API
 * GP-003: Guest Session Management
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { Response, Request } from 'express';
import { GuestAuthService } from './guest-auth.service';
import {
  GuestLoginDto,
  GuestTokenLoginDto,
  GuestPasswordLoginDto,
  SetPasswordByUuidDto,
  SetPasswordByTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/guest-login.dto';
import { JwtGuestGuard } from './guards/jwt-guest.guard';
import { response } from 'src/swagger/Base';

@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiTags('Public - Guest Auth')
@Controller({ version: '1', path: 'public/guest-auth' })
export class GuestAuthController {
  constructor(private readonly guestAuthService: GuestAuthService) {}

  /**
   * GP-002: POST /api/v1/public/guest-auth/login
   * Login with email and booking reference
   */
  @ApiOperation({
    operationId: 'guest-login',
    summary: 'Guest login with email and booking reference',
    description:
      'Authenticates a guest using their email and booking reference number. Returns JWT tokens for session management.',
  })
  @ApiOkResponse({
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            access_token: { type: 'string' },
            refresh_token: { type: 'string' },
            token_type: { type: 'string' },
            expires_in: { type: 'number' },
            guest: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request body',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
  })
  @Post('/login')
  async login(
    @Body() body: GuestLoginDto,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const { guest, error } = await this.guestAuthService.loginWithBookingReference(
        body.email,
        body.booking_reference,
      );

      if (error) {
        const errorMessages: Record<string, string> = {
          invalid_credentials: 'Invalid email or booking reference',
          wedding_not_active: 'This wedding is no longer accepting bookings',
        };

        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: errorMessages[error] || 'Authentication failed',
        });
      }

      const tokens = this.guestAuthService.generateTokens(guest);
      const guestData = this.guestAuthService.formatGuestResponse(guest);

      return res.status(HttpStatus.OK).json({
        message: 'Login successful',
        data: {
          ...tokens,
          guest: guestData,
        },
      });
    } catch (error) {
      console.error('Error during guest login:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * GP-002: GET /api/v1/public/guest-auth/login/token
   * Login with access token from invitation link
   */
  @ApiOperation({
    operationId: 'guest-login-token',
    summary: 'Guest login with access token',
    description:
      'Authenticates a guest using their unique access token from the invitation link. Returns JWT tokens for session management.',
  })
  @ApiOkResponse({
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            access_token: { type: 'string' },
            refresh_token: { type: 'string' },
            token_type: { type: 'string' },
            expires_in: { type: 'number' },
            guest: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid token',
  })
  @ApiQuery({
    name: 'token',
    type: String,
    description: 'Guest access token from invitation link',
    example: 'abc123xyz789',
  })
  @Get('/login/token')
  async loginWithToken(
    @Query('token') token: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      if (!token) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Token is required',
        });
      }

      const { guest, error } = await this.guestAuthService.loginWithToken(token);

      if (error) {
        const errorMessages: Record<string, string> = {
          invalid_token: 'Invalid or expired access token',
          wedding_not_active: 'This wedding is no longer accepting bookings',
        };

        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: errorMessages[error] || 'Authentication failed',
        });
      }

      const tokens = this.guestAuthService.generateTokens(guest);
      const guestData = this.guestAuthService.formatGuestResponse(guest);

      return res.status(HttpStatus.OK).json({
        message: 'Login successful',
        data: {
          ...tokens,
          guest: guestData,
        },
      });
    } catch (error) {
      console.error('Error during token login:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * GP-003: GET /api/v1/public/guest-auth/profile
   * Get authenticated guest's profile
   */
  @ApiOperation({
    operationId: 'guest-profile',
    summary: 'Get guest profile',
    description:
      'Returns the authenticated guest\'s profile including wedding details and bookings.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: { type: 'object' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing token',
  })
  @UseGuards(JwtGuestGuard)
  @Get('/profile')
  async getProfile(
    @Req() req: Request,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const guest = (req as any).guest;
      const profile = await this.guestAuthService.getGuestProfile(guest.id);

      if (!profile) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Guest not found',
        });
      }

      return res.status(HttpStatus.OK).json({
        message: 'Profile retrieved successfully',
        data: profile,
      });
    } catch (error) {
      console.error('Error fetching guest profile:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * GP-003: POST /api/v1/public/guest-auth/refresh
   * Refresh access token
   */
  @ApiOperation({
    operationId: 'guest-refresh-token',
    summary: 'Refresh guest access token',
    description:
      'Generates new access and refresh tokens using a valid refresh token.',
  })
  @ApiOkResponse({
    description: 'Tokens refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            access_token: { type: 'string' },
            refresh_token: { type: 'string' },
            token_type: { type: 'string' },
            expires_in: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid refresh token',
  })
  @Post('/refresh')
  async refreshToken(
    @Body() body: { refresh_token: string },
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      if (!body.refresh_token) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Refresh token is required',
        });
      }

      const { tokens, error } = await this.guestAuthService.refreshToken(
        body.refresh_token,
      );

      if (error) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Invalid or expired refresh token',
        });
      }

      return res.status(HttpStatus.OK).json({
        message: 'Tokens refreshed successfully',
        data: tokens,
      });
    } catch (error) {
      console.error('Error refreshing token:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * PATCH /api/v1/public/guest-auth/booking/:bookingUuid/preferences
   * Update booking preferences (dietary, special requests)
   */
  @ApiOperation({
    operationId: 'guest-update-preferences',
    summary: 'Update booking preferences',
    description:
      'Updates dietary preferences and special requests for a booking.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Preferences updated successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing token',
  })
  @UseGuards(JwtGuestGuard)
  @Patch('/booking/:bookingUuid/preferences')
  async updatePreferences(
    @Param('bookingUuid') bookingUuid: string,
    @Body() body: { special_requests?: string },
    @Req() req: Request,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const guest = (req as any).guest;
      const result = await this.guestAuthService.updateBookingPreferences(
        bookingUuid,
        guest.id,
        body.special_requests,
      );

      if (!result.success) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: result.message || 'Booking not found',
        });
      }

      return res.status(HttpStatus.OK).json({
        message: 'Preferences updated successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * GP-003: POST /api/v1/public/guest-auth/logout
   * Logout (client-side token invalidation)
   */
  @ApiOperation({
    operationId: 'guest-logout',
    summary: 'Guest logout',
    description:
      'Logs out the guest. Since JWTs are stateless, the client should discard the tokens.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Logout successful',
  })
  @UseGuards(JwtGuestGuard)
  @Post('/logout')
  async logout(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // JWT tokens are stateless, so we just acknowledge the logout
    // The client should discard the tokens
    return res.status(HttpStatus.OK).json({
      message: 'Logout successful',
    });
  }

  // ============================================
  // PASSWORD-BASED AUTHENTICATION ENDPOINTS
  // ============================================

  /**
   * POST /api/v1/public/guest-auth/login-password
   * Login with email and password
   */
  @ApiOperation({
    operationId: 'guest-login-password',
    summary: 'Guest login with email and password',
    description:
      'Authenticates a guest using their email and password. Returns JWT tokens for session management.',
  })
  @ApiOkResponse({
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            access_token: { type: 'string' },
            refresh_token: { type: 'string' },
            token_type: { type: 'string' },
            expires_in: { type: 'number' },
            guest: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request body',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or no password set',
  })
  @Post('/login-password')
  async loginWithPassword(
    @Body() body: GuestPasswordLoginDto,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const { guest, error } = await this.guestAuthService.loginWithPassword(
        body.email,
        body.password,
      );

      if (error) {
        const errorMessages: Record<string, string> = {
          invalid_credentials: 'Invalid email or password',
          no_password_set: 'No password set for this account. Please use booking reference to login or set a password first.',
          wedding_not_active: 'This wedding is no longer accepting bookings',
        };

        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: errorMessages[error] || 'Authentication failed',
          error_code: error,
        });
      }

      const tokens = this.guestAuthService.generateTokens(guest);
      const guestData = this.guestAuthService.formatGuestResponse(guest);

      return res.status(HttpStatus.OK).json({
        message: 'Login successful',
        data: {
          ...tokens,
          guest: guestData,
        },
      });
    } catch (error) {
      console.error('Error during password login:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * POST /api/v1/public/guest-auth/set-password
   * Set password for guest (during booking or via token)
   */
  @ApiOperation({
    operationId: 'guest-set-password',
    summary: 'Set guest password',
    description:
      'Sets a password for a guest. Can be called during booking (with guest_uuid) or via email link (with token).',
  })
  @ApiOkResponse({
    description: 'Password set successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid request or passwords do not match',
  })
  @Post('/set-password')
  async setPassword(
    @Body() body: SetPasswordByUuidDto | SetPasswordByTokenDto,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      // Validate passwords match
      if (body.password !== body.confirm_password) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Passwords do not match',
        });
      }

      let result;

      // Check if it's a token-based request or UUID-based
      if ('token' in body && body.token) {
        result = await this.guestAuthService.setPasswordByToken(
          body.token,
          body.email,
          body.password,
        );
      } else if ('guest_uuid' in body && body.guest_uuid) {
        result = await this.guestAuthService.setPasswordByGuestUuid(
          body.guest_uuid,
          body.password,
        );
      } else {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Either guest_uuid or token is required',
        });
      }

      if (!result.success) {
        const errorMessages: Record<string, string> = {
          guest_not_found: 'Guest not found',
          invalid_or_expired_token: 'Invalid or expired token',
          email_mismatch: 'Email does not match the token',
          update_failed: 'Failed to set password',
        };

        return res.status(HttpStatus.BAD_REQUEST).json({
          message: errorMessages[result.error] || 'Failed to set password',
        });
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Password set successfully',
      });
    } catch (error) {
      console.error('Error setting password:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * POST /api/v1/public/guest-auth/forgot-password
   * Request password reset email
   */
  @ApiOperation({
    operationId: 'guest-forgot-password',
    summary: 'Request password reset',
    description:
      'Sends a password reset link to the guest\'s email address.',
  })
  @ApiOkResponse({
    description: 'Password reset email sent (if email exists)',
  })
  @Post('/forgot-password')
  async forgotPassword(
    @Body() body: ForgotPasswordDto,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      await this.guestAuthService.forgotPassword(body.email);

      // Always return success to not reveal if email exists
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'If this email exists in our system, you will receive a password reset link shortly.',
      });
    } catch (error) {
      console.error('Error in forgot password:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * POST /api/v1/public/guest-auth/reset-password
   * Reset password with token
   */
  @ApiOperation({
    operationId: 'guest-reset-password',
    summary: 'Reset password',
    description:
      'Resets the guest\'s password using the token from the reset email.',
  })
  @ApiOkResponse({
    description: 'Password reset successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid token or passwords do not match',
  })
  @Post('/reset-password')
  async resetPassword(
    @Body() body: ResetPasswordDto,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      // Validate passwords match
      if (body.password !== body.confirm_password) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Passwords do not match',
        });
      }

      const result = await this.guestAuthService.resetPassword(
        body.token,
        body.email,
        body.password,
      );

      if (!result.success) {
        const errorMessages: Record<string, string> = {
          invalid_or_expired_token: 'Invalid or expired reset token',
          email_mismatch: 'Email does not match the token',
          update_failed: 'Failed to reset password',
        };

        return res.status(HttpStatus.BAD_REQUEST).json({
          message: errorMessages[result.error] || 'Failed to reset password',
        });
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Password reset successfully. You can now login with your new password.',
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * GET /api/v1/public/guest-auth/validate-set-password-token
   * Validate set password token (for page display)
   */
  @ApiOperation({
    operationId: 'guest-validate-set-password-token',
    summary: 'Validate set password token',
    description:
      'Validates a set password token and returns guest info if valid.',
  })
  @ApiQuery({
    name: 'token',
    type: String,
    description: 'Set password token from email',
  })
  @ApiOkResponse({
    description: 'Token validation result',
  })
  @Get('/validate-set-password-token')
  async validateSetPasswordToken(
    @Query('token') token: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      if (!token) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          valid: false,
          message: 'Token is required',
        });
      }

      const result = await this.guestAuthService.validateSetPasswordToken(token);

      return res.status(HttpStatus.OK).json({
        valid: result.valid,
        email: result.email,
        name: result.name,
      });
    } catch (error) {
      console.error('Error validating set password token:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        valid: false,
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  /**
   * GET /api/v1/public/guest-auth/validate-reset-token
   * Validate password reset token (for page display)
   */
  @ApiOperation({
    operationId: 'guest-validate-reset-token',
    summary: 'Validate password reset token',
    description:
      'Validates a password reset token and returns guest info if valid.',
  })
  @ApiQuery({
    name: 'token',
    type: String,
    description: 'Password reset token from email',
  })
  @ApiOkResponse({
    description: 'Token validation result',
  })
  @Get('/validate-reset-token')
  async validateResetToken(
    @Query('token') token: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      if (!token) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          valid: false,
          message: 'Token is required',
        });
      }

      const result = await this.guestAuthService.validateResetToken(token);

      return res.status(HttpStatus.OK).json({
        valid: result.valid,
        email: result.email,
        name: result.name,
      });
    } catch (error) {
      console.error('Error validating reset token:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        valid: false,
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }
}
