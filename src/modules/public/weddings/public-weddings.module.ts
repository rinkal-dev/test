/**
 * ============================================
 * PUBLIC WEDDINGS MODULE
 * ============================================
 *
 * Module for public wedding data endpoints.
 * No authentication required.
 */

import { Module } from '@nestjs/common';
import { PublicWeddingsController } from './public-weddings.controller';
import { PublicWeddingsService } from './public-weddings.service';
import { publicWeddingsProviders } from './public-weddings.provider';

@Module({
  controllers: [PublicWeddingsController],
  providers: [PublicWeddingsService, ...publicWeddingsProviders],
  exports: [PublicWeddingsService],
})
export class PublicWeddingsModule {}
