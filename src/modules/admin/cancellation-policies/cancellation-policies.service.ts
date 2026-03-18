/**
 * ============================================
 * CANCELLATION POLICIES SERVICE
 * ============================================
 *
 * Service for managing cancellation policies within wedding groups.
 * Includes refund calculation logic based on days before event.
 */

import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CancellationPolicies } from 'src/models/CancellationPolicies';
import { WeddingGroups } from 'src/models/WeddingGroups';
import {
  CANCELLATION_POLICIES_REPOSITORY,
  WEDDING_GROUPS_REPOSITORY,
} from 'src/config/constants';
import { CreateCancellationPolicyDto } from './dto/CreateCancellationPolicyDto';
import { UpdateCancellationPolicyDto } from './dto/UpdateCancellationPolicyDto';

export interface RefundCalculation {
  days_until_event: number;
  applicable_policy: {
    uuid: string;
    days_before_event: number;
    refund_percentage: number;
    description: string | null;
  } | null;
  refund_percentage: number;
  refund_amount: number;
  original_amount: number;
  non_refundable_amount: number;
}

@Injectable()
export class CancellationPoliciesService {
  constructor(
    @Inject(CANCELLATION_POLICIES_REPOSITORY) private policiesModel: typeof CancellationPolicies,
    @Inject(WEDDING_GROUPS_REPOSITORY) private weddingGroupsModel: typeof WeddingGroups,
  ) {}

  /**
   * Get wedding group ID by UUID
   */
  async getWeddingGroupIdByUuid(uuid: string): Promise<number | null> {
    const group = await this.weddingGroupsModel.findOne({
      where: { uuid },
      attributes: ['id'],
      raw: true,
    });
    return group ? group.id : null;
  }

  /**
   * Check if wedding group exists
   */
  async weddingGroupExists(uuid: string): Promise<boolean> {
    const count = await this.weddingGroupsModel.count({ where: { uuid } });
    return count > 0;
  }

  /**
   * Get wedding group event date
   */
  async getWeddingEventDate(weddingGroupId: number): Promise<string | null> {
    const group = await this.weddingGroupsModel.findOne({
      where: { id: weddingGroupId },
      attributes: ['event_start_date'],
      raw: true,
    });
    return group ? group.event_start_date : null;
  }

  /**
   * Create a cancellation policy
   */
  async create(weddingGroupId: number, dto: CreateCancellationPolicyDto): Promise<CancellationPolicies> {
    return await this.policiesModel.create({
      uuid: uuidv4(),
      wedding_group_id: weddingGroupId,
      ...dto,
    } as any);
  }

  /**
   * Find all policies for a wedding group
   */
  async findAllByWeddingGroupId(weddingGroupId: number): Promise<CancellationPolicies[]> {
    return await this.policiesModel.findAll({
      where: { wedding_group_id: weddingGroupId },
      order: [['days_before_event', 'DESC']],
    });
  }

  /**
   * Find policy by UUID
   */
  async findByUuid(uuid: string): Promise<CancellationPolicies | null> {
    return await this.policiesModel.findOne({
      where: { uuid },
    });
  }

  /**
   * Check if policy exists
   */
  async isExist(uuid: string): Promise<CancellationPolicies | null> {
    return await this.policiesModel.findOne({
      where: { uuid },
      attributes: ['id', 'uuid', 'wedding_group_id'],
      raw: true,
    });
  }

  /**
   * Update policy
   */
  async update(uuid: string, dto: UpdateCancellationPolicyDto): Promise<[number]> {
    return await this.policiesModel.update(dto as any, {
      where: { uuid },
    });
  }

  /**
   * Delete policy
   */
  async delete(uuid: string): Promise<number> {
    return await this.policiesModel.destroy({
      where: { uuid },
    });
  }

  /**
   * Sync policies (bulk update/create)
   * Replaces all existing policies with new ones
   */
  async syncPolicies(weddingGroupId: number, policies: CreateCancellationPolicyDto[]): Promise<CancellationPolicies[]> {
    // Delete existing policies
    await this.policiesModel.destroy({
      where: { wedding_group_id: weddingGroupId },
    });

    // Create new policies
    const created: CancellationPolicies[] = [];
    for (const policy of policies) {
      const newPolicy = await this.policiesModel.create({
        uuid: uuidv4(),
        wedding_group_id: weddingGroupId,
        ...policy,
      } as any);
      created.push(newPolicy);
    }

    return created;
  }

  /**
   * Get applicable policy for a cancellation
   * Returns the policy with the highest days_before_event that is <= actual days before event
   */
  async getApplicablePolicy(weddingGroupId: number, cancellationDate: Date): Promise<CancellationPolicies | null> {
    const eventDate = await this.getWeddingEventDate(weddingGroupId);
    if (!eventDate) return null;

    const eventDateTime = new Date(eventDate);
    const daysUntilEvent = Math.ceil((eventDateTime.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60 * 24));

    // If cancellation is after the event, no refund
    if (daysUntilEvent < 0) return null;

    // Find the applicable policy (highest days_before_event that is <= daysUntilEvent)
    const policies = await this.policiesModel.findAll({
      where: {
        wedding_group_id: weddingGroupId,
        is_active: true,
      },
      order: [['days_before_event', 'DESC']],
    });

    for (const policy of policies) {
      if (daysUntilEvent >= policy.days_before_event) {
        return policy;
      }
    }

    // No applicable policy found (cancellation too close to event)
    return null;
  }

  /**
   * Calculate refund amount based on cancellation date and payment amount
   * BE-053: Refund Calculation
   */
  async calculateRefund(
    weddingGroupId: number,
    cancellationDate: Date,
    originalAmount: number,
  ): Promise<RefundCalculation> {
    const eventDate = await this.getWeddingEventDate(weddingGroupId);
    if (!eventDate) {
      return {
        days_until_event: 0,
        applicable_policy: null,
        refund_percentage: 0,
        refund_amount: 0,
        original_amount: originalAmount,
        non_refundable_amount: originalAmount,
      };
    }

    const eventDateTime = new Date(eventDate);
    const daysUntilEvent = Math.ceil((eventDateTime.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60 * 24));

    const policy = await this.getApplicablePolicy(weddingGroupId, cancellationDate);

    if (!policy) {
      // No applicable policy - no refund
      return {
        days_until_event: daysUntilEvent,
        applicable_policy: null,
        refund_percentage: 0,
        refund_amount: 0,
        original_amount: originalAmount,
        non_refundable_amount: originalAmount,
      };
    }

    const refundPercentage = Number(policy.refund_percentage);
    const refundAmount = Math.round((originalAmount * refundPercentage) / 100 * 100) / 100;
    const nonRefundableAmount = Math.round((originalAmount - refundAmount) * 100) / 100;

    return {
      days_until_event: daysUntilEvent,
      applicable_policy: {
        uuid: policy.uuid,
        days_before_event: policy.days_before_event,
        refund_percentage: refundPercentage,
        description: policy.description,
      },
      refund_percentage: refundPercentage,
      refund_amount: refundAmount,
      original_amount: originalAmount,
      non_refundable_amount: nonRefundableAmount,
    };
  }

  /**
   * Get all policies with a preview of what refund would be at each tier
   * BE-054: Get Applicable Policy API
   */
  async getPoliciesWithRefundPreview(weddingGroupId: number, amount: number = 100): Promise<{
    policies: Array<{
      uuid: string;
      days_before_event: number;
      refund_percentage: number;
      description: string | null;
      is_active: boolean;
      example_refund: number;
      example_non_refundable: number;
    }>;
    event_date: string | null;
  }> {
    const policies = await this.findAllByWeddingGroupId(weddingGroupId);
    const eventDate = await this.getWeddingEventDate(weddingGroupId);

    return {
      policies: policies.map(policy => {
        const refundPercentage = Number(policy.refund_percentage);
        const exampleRefund = Math.round((amount * refundPercentage) / 100 * 100) / 100;
        return {
          uuid: policy.uuid,
          days_before_event: policy.days_before_event,
          refund_percentage: refundPercentage,
          description: policy.description,
          is_active: policy.is_active,
          example_refund: exampleRefund,
          example_non_refundable: Math.round((amount - exampleRefund) * 100) / 100,
        };
      }),
      event_date: eventDate,
    };
  }
}
