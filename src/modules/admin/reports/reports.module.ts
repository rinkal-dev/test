import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { reportsProviders } from './reports.provider';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ...reportsProviders],
  exports: [ReportsService],
})
export class ReportsModule {}
