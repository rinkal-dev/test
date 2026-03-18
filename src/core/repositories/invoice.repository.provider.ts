/**
 * ============================================
 * INVOICE REPOSITORY PROVIDER
 * ============================================
 *
 * Factory provider that returns the correct repository
 * implementation based on DATABASE_PROVIDER config.
 *
 * Usage in module:
 *   providers: [InvoiceRepositoryProvider, InvoicesModelProvider]
 *
 * Usage in service:
 *   constructor(
 *     @Inject(INVOICE_REPOSITORY) private invoiceRepository: IInvoiceRepository
 *   ) {}
 *
 * To switch database provider:
 *   Set DATABASE_PROVIDER=supabase in .env
 */

import { Provider } from '@nestjs/common';
import { INVOICES_REPOSITORY } from '../../config/constants';
import { Invoices } from '../../models/Invoices';
import {
  DatabaseProvider,
  getDatabaseConfig,
} from '../../config/database.config';
import { INVOICE_REPOSITORY } from './invoice.repository.interface';
import { SequelizeInvoiceRepository } from './sequelize/sequelize-invoice.repository';
import { SupabaseInvoiceRepository } from './supabase/supabase-invoice.repository';

/**
 * Factory function to create the appropriate repository
 * based on DATABASE_PROVIDER configuration
 */
const invoiceRepositoryFactory = (invoicesModel: typeof Invoices) => {
  const config = getDatabaseConfig();

  switch (config.provider) {
    case DatabaseProvider.SUPABASE:
      console.log('📦 Using Supabase Invoice Repository');
      return new SupabaseInvoiceRepository();

    case DatabaseProvider.SEQUELIZE:
    default:
      console.log('📦 Using Sequelize Invoice Repository');
      return new SequelizeInvoiceRepository(invoicesModel);
  }
};

/**
 * NestJS provider configuration for invoice repository
 * This provider automatically switches between Sequelize and Supabase
 * based on the DATABASE_PROVIDER environment variable.
 */
export const InvoiceRepositoryProvider: Provider = {
  provide: INVOICE_REPOSITORY,
  useFactory: invoiceRepositoryFactory,
  inject: [INVOICES_REPOSITORY],
};

/**
 * Provider for existing INVOICES_REPOSITORY (Sequelize model)
 * Kept for backward compatibility and for SequelizeInvoiceRepository injection
 */
export const InvoicesModelProvider: Provider = {
  provide: INVOICES_REPOSITORY,
  useValue: Invoices,
};
