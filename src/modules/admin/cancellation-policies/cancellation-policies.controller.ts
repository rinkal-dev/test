/**
 * ============================================
 * CANCELLATION POLICIES CONTROLLER
 * ============================================
 *
 * REST API endpoints for managing cancellation policies.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Res,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeaders,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { Response } from 'express';
import { CancellationPoliciesService } from './cancellation-policies.service';
import { CreateCancellationPolicyDto } from './dto/CreateCancellationPolicyDto';
import { UpdateCancellationPolicyDto } from './dto/UpdateCancellationPolicyDto';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { headers, response } from 'src/swagger/Base';

@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@ApiHeaders([headers.accept, headers.accept_language])
@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiUnauthorizedResponse(response.unauthorized)
@ApiUnprocessableEntityResponse(response.validationException)
@ApiTags('Cancellation Policies')
@Controller({ version: '1', path: 'wedding-groups/:groupUuid/policies' })
export class CancellationPoliciesController {
  constructor(private readonly policiesService: CancellationPoliciesService) {}

  // ------------------------------------------------------------- Sync Policies (Bulk) -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'sync-cancellation-policies',
    summary: 'Sync all cancellation policies for a wedding group (replaces existing).',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @Post('/sync')
  async sync(
    @Param('groupUuid') groupUuid: string,
    @Body() policies: CreateCancellationPolicyDto[],
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupId = await this.policiesService.getWeddingGroupIdByUuid(groupUuid);
      if (!groupId) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const created = await this.policiesService.syncPolicies(groupId, policies);
      return res.status(HttpStatus.OK).json({
        message: `Cancellation policies ${i18n.t('responses.updated')}`,
        data: created,
      });
    } catch (error) {
      console.error('Error syncing cancellation policies:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Create Policy -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'create-cancellation-policy',
    summary: 'Create a new cancellation policy for a wedding group.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @Post('/')
  async create(
    @Param('groupUuid') groupUuid: string,
    @Body() createDto: CreateCancellationPolicyDto,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupId = await this.policiesService.getWeddingGroupIdByUuid(groupUuid);
      if (!groupId) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const policy = await this.policiesService.create(groupId, createDto);
      return res.status(HttpStatus.CREATED).json({
        message: `Cancellation policy ${i18n.t('responses.created')}`,
        data: policy,
      });
    } catch (error) {
      console.error('Error creating cancellation policy:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Get All Policies -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-cancellation-policies',
    summary: 'Get all cancellation policies for a wedding group.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @Get('/')
  async findAll(
    @Param('groupUuid') groupUuid: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupId = await this.policiesService.getWeddingGroupIdByUuid(groupUuid);
      if (!groupId) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const policies = await this.policiesService.findAllByWeddingGroupId(groupId);
      return res.status(HttpStatus.OK).json({
        message: `Cancellation policies ${i18n.t('responses.list')}`,
        data: policies,
      });
    } catch (error) {
      console.error('Error fetching cancellation policies:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Get Policies with Refund Preview (BE-054) -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-policies-with-preview',
    summary: 'Get all policies with refund preview for a given amount.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse({
    description: 'Policies with example refund calculations',
  })
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @ApiQuery({ name: 'amount', type: Number, required: false, description: 'Amount to calculate refund preview (default: 100)' })
  @Get('/preview')
  async getPoliciesWithPreview(
    @Param('groupUuid') groupUuid: string,
    @Query('amount') amount: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupId = await this.policiesService.getWeddingGroupIdByUuid(groupUuid);
      if (!groupId) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const previewAmount = amount ? parseFloat(amount) : 100;
      const result = await this.policiesService.getPoliciesWithRefundPreview(groupId, previewAmount);

      return res.status(HttpStatus.OK).json({
        message: 'Policies with refund preview',
        data: result,
      });
    } catch (error) {
      console.error('Error getting policies preview:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Calculate Refund (BE-053) -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'calculate-refund',
    summary: 'Calculate refund amount based on cancellation date and original amount.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse({
    description: 'Refund calculation result',
  })
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @ApiQuery({ name: 'amount', type: Number, required: true, description: 'Original payment amount' })
  @ApiQuery({ name: 'cancellation_date', type: String, required: false, description: 'Cancellation date (YYYY-MM-DD), defaults to today' })
  @Get('/calculate-refund')
  async calculateRefund(
    @Param('groupUuid') groupUuid: string,
    @Query('amount') amount: string,
    @Query('cancellation_date') cancellationDateStr: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupId = await this.policiesService.getWeddingGroupIdByUuid(groupUuid);
      if (!groupId) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      if (!amount) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Amount is required',
        });
      }

      const originalAmount = parseFloat(amount);
      const cancellationDate = cancellationDateStr ? new Date(cancellationDateStr) : new Date();

      const result = await this.policiesService.calculateRefund(groupId, cancellationDate, originalAmount);

      return res.status(HttpStatus.OK).json({
        message: 'Refund calculation completed',
        data: result,
      });
    } catch (error) {
      console.error('Error calculating refund:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Get Policy Details -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-cancellation-policy-details',
    summary: 'Get cancellation policy details by UUID.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @ApiParam({ name: 'uuid', type: String, description: 'Policy UUID' })
  @Get('/:uuid')
  async findOne(
    @Param('groupUuid') groupUuid: string,
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupExists = await this.policiesService.weddingGroupExists(groupUuid);
      if (!groupExists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const policy = await this.policiesService.findByUuid(uuid);
      if (!policy) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Cancellation policy ${i18n.t('responses.not_found')}`,
        });
      }

      return res.status(HttpStatus.OK).json({
        message: `Cancellation policy ${i18n.t('responses.details')}`,
        data: policy,
      });
    } catch (error) {
      console.error('Error fetching cancellation policy:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Update Policy -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'update-cancellation-policy',
    summary: 'Update cancellation policy details.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @ApiParam({ name: 'uuid', type: String, description: 'Policy UUID' })
  @Patch('/:uuid')
  async update(
    @Param('groupUuid') groupUuid: string,
    @Param('uuid') uuid: string,
    @Body() updateDto: UpdateCancellationPolicyDto,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupExists = await this.policiesService.weddingGroupExists(groupUuid);
      if (!groupExists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const existingPolicy = await this.policiesService.isExist(uuid);
      if (!existingPolicy) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Cancellation policy ${i18n.t('responses.not_found')}`,
        });
      }

      await this.policiesService.update(uuid, updateDto);
      return res.status(HttpStatus.OK).json({
        message: `Cancellation policy ${i18n.t('responses.updated')}`,
      });
    } catch (error) {
      console.error('Error updating cancellation policy:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Delete Policy -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'delete-cancellation-policy',
    summary: 'Delete a cancellation policy.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @ApiParam({ name: 'uuid', type: String, description: 'Policy UUID' })
  @Delete('/:uuid')
  async delete(
    @Param('groupUuid') groupUuid: string,
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupExists = await this.policiesService.weddingGroupExists(groupUuid);
      if (!groupExists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const existingPolicy = await this.policiesService.isExist(uuid);
      if (!existingPolicy) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Cancellation policy ${i18n.t('responses.not_found')}`,
        });
      }

      await this.policiesService.delete(uuid);
      return res.status(HttpStatus.OK).json({
        message: `Cancellation policy ${i18n.t('responses.deleted')}`,
      });
    } catch (error) {
      console.error('Error deleting cancellation policy:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }
}
