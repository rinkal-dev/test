/**
 * ============================================
 * CANCELLATION POLICIES MODULE
 * ============================================
 *
 * Module for managing cancellation policies within wedding groups.
 */

import { Module } from '@nestjs/common';
import { CancellationPoliciesController } from './cancellation-policies.controller';
import { CancellationPoliciesService } from './cancellation-policies.service';
import { cancellationPoliciesProviders } from './cancellation-policies.provider';

@Module({
  controllers: [CancellationPoliciesController],
  providers: [CancellationPoliciesService, ...cancellationPoliciesProviders],
  exports: [CancellationPoliciesService],
})
export class CancellationPoliciesModule {}
