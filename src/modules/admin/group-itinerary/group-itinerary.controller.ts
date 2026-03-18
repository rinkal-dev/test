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
import { GroupItineraryService } from './group-itinerary.service';
import { CreateGroupItineraryDto } from './dto/CreateGroupItineraryDto';
import { UpdateGroupItineraryDto } from './dto/UpdateGroupItineraryDto';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { headers, response } from 'src/swagger/Base';

@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@ApiHeaders([headers.accept, headers.accept_language])
@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiUnauthorizedResponse(response.unauthorized)
@ApiUnprocessableEntityResponse(response.validationException)
@ApiTags('Group Itinerary')
@Controller({ version: '1', path: 'wedding-groups/:groupUuid/itinerary' })
export class GroupItineraryController {
  constructor(private readonly itineraryService: GroupItineraryService) {}

  // ------------------------------------------------------------- Sync Itinerary (Bulk) -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'sync-group-itinerary',
    summary: 'Sync all itinerary events for a wedding group (replaces existing).',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @Post('/sync')
  async sync(
    @Param('groupUuid') groupUuid: string,
    @Body() events: CreateGroupItineraryDto[],
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupId = await this.itineraryService.getWeddingGroupIdByUuid(groupUuid);
      if (!groupId) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const created = await this.itineraryService.syncItinerary(groupId, events);
      return res.status(HttpStatus.OK).json({
        message: `Group itinerary ${i18n.t('responses.updated')}`,
        data: created,
      });
    } catch (error) {
      console.error('Error syncing group itinerary:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Create Event -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'create-group-itinerary-event',
    summary: 'Create a new itinerary event for a wedding group.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @Post('/')
  async create(
    @Param('groupUuid') groupUuid: string,
    @Body() createDto: CreateGroupItineraryDto,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupId = await this.itineraryService.getWeddingGroupIdByUuid(groupUuid);
      if (!groupId) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const event = await this.itineraryService.create(groupId, createDto);
      return res.status(HttpStatus.CREATED).json({
        message: `Itinerary event ${i18n.t('responses.created')}`,
        data: event,
      });
    } catch (error) {
      console.error('Error creating itinerary event:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Get All Events -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-group-itinerary',
    summary: 'Get all itinerary events for a wedding group.',
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
      const groupId = await this.itineraryService.getWeddingGroupIdByUuid(groupUuid);
      if (!groupId) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const events = await this.itineraryService.findAllByWeddingGroupId(groupId);
      return res.status(HttpStatus.OK).json({
        message: `Group itinerary ${i18n.t('responses.list')}`,
        data: events,
      });
    } catch (error) {
      console.error('Error fetching group itinerary:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Get Event Details -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-group-itinerary-event-details',
    summary: 'Get itinerary event details by UUID.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @ApiParam({ name: 'uuid', type: String, description: 'Event UUID' })
  @Get('/:uuid')
  async findOne(
    @Param('groupUuid') groupUuid: string,
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupExists = await this.itineraryService.weddingGroupExists(groupUuid);
      if (!groupExists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const event = await this.itineraryService.findByUuid(uuid);
      if (!event) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Itinerary event ${i18n.t('responses.not_found')}`,
        });
      }

      return res.status(HttpStatus.OK).json({
        message: `Itinerary event ${i18n.t('responses.details')}`,
        data: event,
      });
    } catch (error) {
      console.error('Error fetching itinerary event:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Update Event -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'update-group-itinerary-event',
    summary: 'Update itinerary event details.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @ApiParam({ name: 'uuid', type: String, description: 'Event UUID' })
  @Patch('/:uuid')
  async update(
    @Param('groupUuid') groupUuid: string,
    @Param('uuid') uuid: string,
    @Body() updateDto: UpdateGroupItineraryDto,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupExists = await this.itineraryService.weddingGroupExists(groupUuid);
      if (!groupExists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const existingEvent = await this.itineraryService.isExist(uuid);
      if (!existingEvent) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Itinerary event ${i18n.t('responses.not_found')}`,
        });
      }

      await this.itineraryService.update(uuid, updateDto);
      return res.status(HttpStatus.OK).json({
        message: `Itinerary event ${i18n.t('responses.updated')}`,
      });
    } catch (error) {
      console.error('Error updating itinerary event:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Delete Event -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'delete-group-itinerary-event',
    summary: 'Delete an itinerary event.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @ApiParam({ name: 'uuid', type: String, description: 'Event UUID' })
  @Delete('/:uuid')
  async delete(
    @Param('groupUuid') groupUuid: string,
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupExists = await this.itineraryService.weddingGroupExists(groupUuid);
      if (!groupExists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const existingEvent = await this.itineraryService.isExist(uuid);
      if (!existingEvent) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Itinerary event ${i18n.t('responses.not_found')}`,
        });
      }

      await this.itineraryService.delete(uuid);
      return res.status(HttpStatus.OK).json({
        message: `Itinerary event ${i18n.t('responses.deleted')}`,
      });
    } catch (error) {
      console.error('Error deleting itinerary event:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Toggle Event Status -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'toggle-group-itinerary-event-status',
    summary: 'Activate or deactivate an itinerary event.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @ApiParam({ name: 'uuid', type: String, description: 'Event UUID' })
  @Patch('/:uuid/status')
  async toggleStatus(
    @Param('groupUuid') groupUuid: string,
    @Param('uuid') uuid: string,
    @Body('is_active') isActive: boolean,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupExists = await this.itineraryService.weddingGroupExists(groupUuid);
      if (!groupExists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const existingEvent = await this.itineraryService.isExist(uuid);
      if (!existingEvent) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Itinerary event ${i18n.t('responses.not_found')}`,
        });
      }

      await this.itineraryService.toggleStatus(uuid, isActive);
      return res.status(HttpStatus.OK).json({
        message: `Itinerary event ${i18n.t('responses.status_change')}`,
      });
    } catch (error) {
      console.error('Error toggling itinerary event status:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Reorder Events -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'reorder-group-itinerary',
    summary: 'Reorder itinerary events by providing ordered UUIDs.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @Post('/reorder')
  async reorder(
    @Param('groupUuid') groupUuid: string,
    @Body('ordered_uuids') orderedUuids: string[],
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupId = await this.itineraryService.getWeddingGroupIdByUuid(groupUuid);
      if (!groupId) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      await this.itineraryService.reorder(groupId, orderedUuids);
      return res.status(HttpStatus.OK).json({
        message: `Itinerary events ${i18n.t('responses.updated')}`,
      });
    } catch (error) {
      console.error('Error reordering itinerary events:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }
}
