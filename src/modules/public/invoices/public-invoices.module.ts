import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PublicInvoicesController } from './public-invoices.controller';
import { InvoicesModule } from '../../admin/invoices/invoices.module';

@Module({
  imports: [
    InvoicesModule,
    JwtModule.register({}), // JWT config comes from environment in controller
  ],
  controllers: [PublicInvoicesController],
})
export class PublicInvoicesModule {}
