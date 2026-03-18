import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
  Header,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import { InvoicesService } from './invoices.service';
import { InvoicePdfService } from './services/invoice-pdf.service';
import { InvoiceEmailService } from './services/invoice-email.service';
import { CreateInvoiceDto, GenerateInvoiceForBookingDto } from './dto/CreateInvoiceDto';
import { UpdateInvoiceDto, UpdateInvoiceStatusDto, MarkInvoicePaidDto } from './dto/UpdateInvoiceDto';
import { InvoiceQueryDto } from './dto/InvoiceQueryDto';
import { SendInvoiceEmailDto } from './dto/SendInvoiceEmailDto';
import { JwtAdminAuthGuard } from '../../../auth/jwt-admin-auth.guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/decorators/require-permission.decorator';
import { getDataFilterAdminId, hasFullDataAccess } from 'src/helpers/data-ownership.helper';

@ApiTags('Admin - Invoices')
@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard, PermissionGuard)
@Controller('admin/invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly invoicePdfService: InvoicePdfService,
    private readonly invoiceEmailService: InvoiceEmailService,
  ) {}

  /**
   * Generate invoice for a booking
   */
  @Post('booking/:bookingUuid/generate')
  @ApiOperation({ summary: 'Generate invoice for a booking' })
  @ApiParam({ name: 'bookingUuid', description: 'Booking UUID' })
  @ApiResponse({ status: 201, description: 'Invoice generated successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 409, description: 'Invoice of this type already exists' })
  @RequirePermission('invoices.create')
  async generateInvoice(
    @Param('bookingUuid') bookingUuid: string,
    @Body() dto: GenerateInvoiceForBookingDto,
  ) {
    const invoice = await this.invoicesService.generateInvoice(bookingUuid, dto);
    return {
      message: 'Invoice generated successfully',
      data: invoice,
    };
  }

  /**
   * Create invoice manually
   */
  @Post()
  @ApiOperation({ summary: 'Create invoice manually' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 409, description: 'Invoice of this type already exists' })
  @RequirePermission('invoices.create')
  async create(@Body() dto: CreateInvoiceDto) {
    const invoice = await this.invoicesService.create(dto);
    return {
      message: 'Invoice created successfully',
      data: invoice,
    };
  }

  /**
   * Get all invoices with filters
   */
  @Get()
  @ApiOperation({ summary: 'Get all invoices with filters' })
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  @RequirePermission('invoices.view')
  async findAll(@Query() query: InvoiceQueryDto, @Req() req: Request) {
    const admin = req.user as any;
    const filterAdminId = getDataFilterAdminId(admin);
    const result = await this.invoicesService.findAll(query, filterAdminId);
    return {
      message: 'Invoices retrieved successfully',
      ...result,
    };
  }

  /**
   * Get invoice statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get invoice statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @RequirePermission('invoices.view')
  async getStats(@Query('wedding_group_id') weddingGroupId?: number) {
    const stats = await this.invoicesService.getStats(weddingGroupId);
    return {
      message: 'Statistics retrieved successfully',
      data: stats,
    };
  }

  /**
   * Get invoices for a booking
   */
  @Get('booking/:bookingUuid')
  @ApiOperation({ summary: 'Get invoices for a booking' })
  @ApiParam({ name: 'bookingUuid', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  @RequirePermission('invoices.view')
  async findByBooking(@Param('bookingUuid') bookingUuid: string) {
    const invoices = await this.invoicesService.findByBookingUuid(bookingUuid);
    return {
      message: 'Invoices retrieved successfully',
      data: invoices,
    };
  }

  /**
   * Download invoice PDF
   */
  @Get(':uuid/pdf')
  @ApiOperation({ summary: 'Download invoice PDF' })
  @ApiParam({ name: 'uuid', description: 'Invoice UUID' })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'PDF downloaded successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @RequirePermission('invoices.download')
  async downloadPdf(
    @Param('uuid') uuid: string,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ): Promise<StreamableFile> {
    const admin = req.user as any;
    const existing = await this.invoicesService.findByUuid(uuid);

    // Check if admin has access to this invoice's wedding group
    if (!hasFullDataAccess(admin) && existing.booking?.wedding_group?.created_by !== admin.id) {
      throw new ForbiddenException('You do not have access to download this invoice');
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
   * Generate and save PDF for invoice
   */
  @Post(':uuid/pdf/generate')
  @ApiOperation({ summary: 'Generate and save PDF for invoice' })
  @ApiParam({ name: 'uuid', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'PDF generated and saved' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @RequirePermission('invoices.create')
  async generateAndSavePdf(@Param('uuid') uuid: string, @Req() req: Request) {
    const admin = req.user as any;
    const existing = await this.invoicesService.findByUuid(uuid);

    // Check if admin has access to this invoice's wedding group
    if (!hasFullDataAccess(admin) && existing.booking?.wedding_group?.created_by !== admin.id) {
      throw new ForbiddenException('You do not have access to this invoice');
    }

    const pdfUrl = await this.invoicePdfService.generateAndSavePdf(uuid);
    return {
      message: 'PDF generated and saved successfully',
      data: { pdf_url: pdfUrl },
    };
  }

  /**
   * Send invoice email to guest
   */
  @Post(':uuid/send')
  @ApiOperation({ summary: 'Send invoice email to guest' })
  @ApiParam({ name: 'uuid', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Invoice email sent successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({ status: 400, description: 'Failed to send email' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @RequirePermission('invoices.send')
  async sendInvoiceEmail(
    @Param('uuid') uuid: string,
    @Body() dto: SendInvoiceEmailDto,
    @Req() req: Request,
  ) {
    const admin = req.user as any;
    const existing = await this.invoicesService.findByUuid(uuid);

    // Check if admin has access to this invoice's wedding group
    if (!hasFullDataAccess(admin) && existing.booking?.wedding_group?.created_by !== admin.id) {
      throw new ForbiddenException('You do not have access to send this invoice');
    }

    const result = await this.invoiceEmailService.sendInvoiceEmail(uuid, {
      includePdfAttachment: dto.include_pdf_attachment,
      customMessage: dto.custom_message,
    });
    return {
      message: result.message,
      data: { success: result.success },
    };
  }

  /**
   * Get invoice by UUID
   */
  @Get(':uuid')
  @ApiOperation({ summary: 'Get invoice by UUID' })
  @ApiParam({ name: 'uuid', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @RequirePermission('invoices.view')
  async findByUuid(@Param('uuid') uuid: string, @Req() req: Request) {
    const admin = req.user as any;
    const invoice = await this.invoicesService.findByUuid(uuid);

    // Check if admin has access to this invoice's wedding group
    if (!hasFullDataAccess(admin) && invoice.booking?.wedding_group?.created_by !== admin.id) {
      throw new ForbiddenException('You do not have access to this invoice');
    }

    return {
      message: 'Invoice retrieved successfully',
      data: invoice,
    };
  }

  /**
   * Update invoice
   */
  @Patch(':uuid')
  @ApiOperation({ summary: 'Update invoice' })
  @ApiParam({ name: 'uuid', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Invoice updated successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({ status: 400, description: 'Cannot update this invoice' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @RequirePermission('invoices.create')
  async update(@Param('uuid') uuid: string, @Body() dto: UpdateInvoiceDto, @Req() req: Request) {
    const admin = req.user as any;
    const existing = await this.invoicesService.findByUuid(uuid);

    // Check if admin has access to this invoice's wedding group
    if (!hasFullDataAccess(admin) && existing.booking?.wedding_group?.created_by !== admin.id) {
      throw new ForbiddenException('You do not have access to update this invoice');
    }

    const invoice = await this.invoicesService.update(uuid, dto);
    return {
      message: 'Invoice updated successfully',
      data: invoice,
    };
  }

  /**
   * Update invoice status
   */
  @Patch(':uuid/status')
  @ApiOperation({ summary: 'Update invoice status' })
  @ApiParam({ name: 'uuid', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @RequirePermission('invoices.create')
  async updateStatus(
    @Param('uuid') uuid: string,
    @Body() dto: UpdateInvoiceStatusDto,
    @Req() req: Request,
  ) {
    const admin = req.user as any;
    const existing = await this.invoicesService.findByUuid(uuid);

    // Check if admin has access to this invoice's wedding group
    if (!hasFullDataAccess(admin) && existing.booking?.wedding_group?.created_by !== admin.id) {
      throw new ForbiddenException('You do not have access to update this invoice');
    }

    const invoice = await this.invoicesService.updateStatus(uuid, dto);
    return {
      message: 'Invoice status updated successfully',
      data: invoice,
    };
  }

  /**
   * Mark invoice as paid
   */
  @Post(':uuid/paid')
  @ApiOperation({ summary: 'Mark invoice as paid' })
  @ApiParam({ name: 'uuid', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Invoice marked as paid' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({ status: 400, description: 'Cannot mark this invoice as paid' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @RequirePermission('invoices.mark-paid')
  async markAsPaid(@Param('uuid') uuid: string, @Body() dto: MarkInvoicePaidDto, @Req() req: Request) {
    const admin = req.user as any;
    const existing = await this.invoicesService.findByUuid(uuid);

    // Check if admin has access to this invoice's wedding group
    if (!hasFullDataAccess(admin) && existing.booking?.wedding_group?.created_by !== admin.id) {
      throw new ForbiddenException('You do not have access to this invoice');
    }

    const invoice = await this.invoicesService.markAsPaid(uuid, dto);
    return {
      message: 'Invoice marked as paid',
      data: invoice,
    };
  }

  /**
   * Cancel invoice
   */
  @Post(':uuid/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel invoice' })
  @ApiParam({ name: 'uuid', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Invoice cancelled' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({ status: 400, description: 'Cannot cancel this invoice' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @RequirePermission('invoices.create')
  async cancel(@Param('uuid') uuid: string, @Req() req: Request) {
    const admin = req.user as any;
    const existing = await this.invoicesService.findByUuid(uuid);

    // Check if admin has access to this invoice's wedding group
    if (!hasFullDataAccess(admin) && existing.booking?.wedding_group?.created_by !== admin.id) {
      throw new ForbiddenException('You do not have access to cancel this invoice');
    }

    const invoice = await this.invoicesService.cancel(uuid);
    return {
      message: 'Invoice cancelled',
      data: invoice,
    };
  }

  /**
   * Delete invoice (only draft)
   */
  @Delete(':uuid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete invoice (only draft)' })
  @ApiParam({ name: 'uuid', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Invoice deleted' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({ status: 400, description: 'Only draft invoices can be deleted' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @RequirePermission('invoices.create')
  async delete(@Param('uuid') uuid: string, @Req() req: Request) {
    const admin = req.user as any;
    const existing = await this.invoicesService.findByUuid(uuid);

    // Check if admin has access to this invoice's wedding group
    if (!hasFullDataAccess(admin) && existing.booking?.wedding_group?.created_by !== admin.id) {
      throw new ForbiddenException('You do not have access to delete this invoice');
    }

    await this.invoicesService.delete(uuid);
    return {
      message: 'Invoice deleted successfully',
    };
  }
}
