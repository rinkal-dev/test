import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  StreamableFile,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { InvoicePdfService } from '../../admin/invoices/services/invoice-pdf.service';
import { InvoicesService } from '../../admin/invoices/invoices.service';
import { getEnvironmentData } from 'src/helpers/general';

@ApiTags('Public - Invoices')
@Controller({ version: '1', path: 'public/invoices' })
export class PublicInvoicesController {
  constructor(
    private readonly invoicePdfService: InvoicePdfService,
    private readonly invoicesService: InvoicesService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Validate token - supports BOTH JWT tokens and simple access tokens
   * Returns guest info if valid, null if invalid
   * This ensures backward compatibility with old bookings using simple access tokens
   */
  private validateToken(
    token: string,
    invoice: any,
  ): { isValid: boolean; method: 'jwt' | 'access_token' | null } {
    // First, try JWT validation
    try {
      const payload = this.jwtService.verify(token, {
        secret: getEnvironmentData('JWT_SECRET'),
      });

      if (payload.type === 'guest') {
        const guestId = Number(payload.sub);
        const invoiceGuestId = Number((invoice.booking as any)?.guest_id);

        if (invoiceGuestId && invoiceGuestId === guestId) {
          return { isValid: true, method: 'jwt' };
        }
      }
    } catch (jwtError) {
      // JWT validation failed, try simple access token
    }

    // Fallback: Try simple access_token validation (backward compatibility)
    const guestAccessToken = (invoice.booking as any)?.guest?.access_token;
    if (guestAccessToken && guestAccessToken === token) {
      return { isValid: true, method: 'access_token' };
    }

    return { isValid: false, method: null };
  }

  /**
   * Download invoice PDF (public with token validation)
   * Used by guests to download their invoice from email links
   * Supports both JWT tokens and simple access tokens for backward compatibility
   */
  @Get(':uuid/pdf')
  @ApiOperation({ summary: 'Download invoice PDF (public with token)' })
  @ApiParam({ name: 'uuid', description: 'Invoice UUID' })
  @ApiQuery({ name: 'token', description: 'Guest access token (JWT or simple token)', required: true })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'PDF downloaded successfully' })
  @ApiResponse({ status: 400, description: 'Token required' })
  @ApiResponse({ status: 404, description: 'Invoice not found or access denied' })
  async downloadPdf(
    @Param('uuid') uuid: string,
    @Query('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    if (!token) {
      throw new BadRequestException('Access token is required');
    }

    // Get invoice with relations to validate access
    const invoice = await this.invoicesService.findByUuid(uuid);

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Validate token (supports both JWT and simple access_token)
    const validation = this.validateToken(token, invoice);

    if (!validation.isValid) {
      throw new NotFoundException('Invoice not found or access denied');
    }

    const { buffer, filename } = await this.invoicePdfService.generatePdf(uuid);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    return new StreamableFile(buffer);
  }

  /**
   * Get invoice details (public with token validation)
   * Used by guests to view their invoice details
   * Supports both JWT tokens and simple access tokens for backward compatibility
   */
  @Get(':uuid')
  @ApiOperation({ summary: 'Get invoice details (public with token)' })
  @ApiParam({ name: 'uuid', description: 'Invoice UUID' })
  @ApiQuery({ name: 'token', description: 'Guest access token (JWT or simple token)', required: true })
  @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Token required' })
  @ApiResponse({ status: 404, description: 'Invoice not found or access denied' })
  async getInvoice(
    @Param('uuid') uuid: string,
    @Query('token') token: string,
  ) {
    if (!token) {
      throw new BadRequestException('Access token is required');
    }

    const invoice = await this.invoicesService.findByUuid(uuid);

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Validate token (supports both JWT and simple access_token)
    const validation = this.validateToken(token, invoice);

    if (!validation.isValid) {
      throw new NotFoundException('Invoice not found or access denied');
    }

    return {
      message: 'Invoice retrieved successfully',
      data: invoice,
    };
  }
}
