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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeaders,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { Response } from 'express';
import { GroupAddonsService } from './group-addons.service';
import { CreateGroupAddonDto } from './dto/CreateGroupAddonDto';
import { UpdateGroupAddonDto } from './dto/UpdateGroupAddonDto';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { headers, response } from 'src/swagger/Base';

@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@ApiHeaders([headers.accept, headers.accept_language])
@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiUnauthorizedResponse(response.unauthorized)
@ApiUnprocessableEntityResponse(response.validationException)
@ApiTags('Group Addons')
@Controller({ version: '1', path: 'wedding-groups/:groupUuid/addons' })
export class GroupAddonsController {
  constructor(private readonly addonsService: GroupAddonsService) {}

  // ------------------------------------------------------------- Sync Addons (Bulk) -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'sync-group-addons',
    summary: 'Sync all addons for a wedding group (replaces existing).',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @Post('/sync')
  async sync(
    @Param('groupUuid') groupUuid: string,
    @Body() addons: CreateGroupAddonDto[],
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupId = await this.addonsService.getWeddingGroupIdByUuid(groupUuid);
      if (!groupId) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const created = await this.addonsService.syncAddons(groupId, addons);
      return res.status(HttpStatus.OK).json({
        message: `Group addons ${i18n.t('responses.updated')}`,
        data: created,
      });
    } catch (error) {
      console.error('Error syncing group addons:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Create Addon -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'create-group-addon',
    summary: 'Create a new addon for a wedding group.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @Post('/')
  async create(
    @Param('groupUuid') groupUuid: string,
    @Body() createDto: CreateGroupAddonDto,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupId = await this.addonsService.getWeddingGroupIdByUuid(groupUuid);
      if (!groupId) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const addon = await this.addonsService.create(groupId, createDto);
      return res.status(HttpStatus.CREATED).json({
        message: `Group addon ${i18n.t('responses.created')}`,
        data: addon,
      });
    } catch (error) {
      console.error('Error creating group addon:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Get All Addons -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-group-addons',
    summary: 'Get all addons for a wedding group.',
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
      const groupId = await this.addonsService.getWeddingGroupIdByUuid(groupUuid);
      if (!groupId) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const addons = await this.addonsService.findAllByWeddingGroupId(groupId);
      return res.status(HttpStatus.OK).json({
        message: `Group addons ${i18n.t('responses.list')}`,
        data: addons,
      });
    } catch (error) {
      console.error('Error fetching group addons:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Get Addon Details -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-group-addon-details',
    summary: 'Get addon details by UUID.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @ApiParam({ name: 'uuid', type: String, description: 'Addon UUID' })
  @Get('/:uuid')
  async findOne(
    @Param('groupUuid') groupUuid: string,
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupExists = await this.addonsService.weddingGroupExists(groupUuid);
      if (!groupExists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const addon = await this.addonsService.findByUuid(uuid);
      if (!addon) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Group addon ${i18n.t('responses.not_found')}`,
        });
      }

      return res.status(HttpStatus.OK).json({
        message: `Group addon ${i18n.t('responses.details')}`,
        data: addon,
      });
    } catch (error) {
      console.error('Error fetching group addon:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Update Addon -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'update-group-addon',
    summary: 'Update addon details.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @ApiParam({ name: 'uuid', type: String, description: 'Addon UUID' })
  @Patch('/:uuid')
  async update(
    @Param('groupUuid') groupUuid: string,
    @Param('uuid') uuid: string,
    @Body() updateDto: UpdateGroupAddonDto,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupExists = await this.addonsService.weddingGroupExists(groupUuid);
      if (!groupExists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const existingAddon = await this.addonsService.isExist(uuid);
      if (!existingAddon) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Group addon ${i18n.t('responses.not_found')}`,
        });
      }

      await this.addonsService.update(uuid, updateDto);
      return res.status(HttpStatus.OK).json({
        message: `Group addon ${i18n.t('responses.updated')}`,
      });
    } catch (error) {
      console.error('Error updating group addon:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Delete Addon -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'delete-group-addon',
    summary: 'Delete an addon.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @ApiParam({ name: 'uuid', type: String, description: 'Addon UUID' })
  @Delete('/:uuid')
  async delete(
    @Param('groupUuid') groupUuid: string,
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupExists = await this.addonsService.weddingGroupExists(groupUuid);
      if (!groupExists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const existingAddon = await this.addonsService.isExist(uuid);
      if (!existingAddon) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Group addon ${i18n.t('responses.not_found')}`,
        });
      }

      await this.addonsService.delete(uuid);
      return res.status(HttpStatus.OK).json({
        message: `Group addon ${i18n.t('responses.deleted')}`,
      });
    } catch (error) {
      console.error('Error deleting group addon:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Toggle Addon Status -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'toggle-group-addon-status',
    summary: 'Activate or deactivate an addon.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @ApiParam({ name: 'uuid', type: String, description: 'Addon UUID' })
  @Patch('/:uuid/status')
  async toggleStatus(
    @Param('groupUuid') groupUuid: string,
    @Param('uuid') uuid: string,
    @Body('is_active') isActive: boolean,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupExists = await this.addonsService.weddingGroupExists(groupUuid);
      if (!groupExists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const existingAddon = await this.addonsService.isExist(uuid);
      if (!existingAddon) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Group addon ${i18n.t('responses.not_found')}`,
        });
      }

      await this.addonsService.toggleStatus(uuid, isActive);
      return res.status(HttpStatus.OK).json({
        message: `Group addon ${i18n.t('responses.status_change')}`,
      });
    } catch (error) {
      console.error('Error toggling group addon status:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }
}
