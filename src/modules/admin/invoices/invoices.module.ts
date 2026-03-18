import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicePdfService } from './services/invoice-pdf.service';
import { InvoiceEmailService } from './services/invoice-email.service';
import { BookingsModelProvider, PaymentsModelProvider } from './invoices.provider';
import {
  InvoiceRepositoryProvider,
  InvoicesModelProvider,
} from '../../../core/repositories/invoice.repository.provider';

@Module({
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    InvoicePdfService,
    InvoiceEmailService,
    // Repository providers (support Sequelize + Supabase)
    InvoicesModelProvider,
    InvoiceRepositoryProvider,
    // Model providers for related entities
    BookingsModelProvider,
    PaymentsModelProvider,
  ],
  exports: [InvoicesService, InvoicePdfService, InvoiceEmailService],
})
export class InvoicesModule {}
