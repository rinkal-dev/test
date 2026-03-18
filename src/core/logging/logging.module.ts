/**
 * ============================================
 * LOGGING MODULE
 * ============================================
 * Provides Winston logging and log viewer endpoints.
 */

import { Module, Global } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './winston.config';
import { LoggingService } from './logging.service';
import { LoggingController } from './logging.controller';
import { JwtAdminAuthGuard } from '../../auth/jwt-admin-auth.guard';

@Global()
@Module({
  imports: [
    WinstonModule.forRoot(winstonConfig),
  ],
  controllers: [LoggingController],
  providers: [
    LoggingService,
    JwtAdminAuthGuard,
  ],
  exports: [WinstonModule, LoggingService],
})
export class LoggingModule {}
