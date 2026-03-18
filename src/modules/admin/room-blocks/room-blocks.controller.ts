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
  Req,
  HttpStatus,
  Query,
  Ip,
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
import { Response, Request } from 'express';
import { RoomBlocksService } from './room-blocks.service';
import { CreateRoomBlockDto } from './dto/CreateRoomBlockDto';
import { UpdateRoomBlockDto } from './dto/UpdateRoomBlockDto';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { headers, response } from 'src/swagger/Base';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@ApiHeaders([headers.accept, headers.accept_language])
@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiUnauthorizedResponse(response.unauthorized)
@ApiUnprocessableEntityResponse(response.validationException)
@ApiTags('Room Blocks')
@Controller({ version: '1', path: 'wedding-groups/:groupUuid/room-blocks' })
export class RoomBlocksController {
  constructor(
    private readonly roomBlocksService: RoomBlocksService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  // ------------------------------------------------------------- Sync Room Blocks (Bulk) -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'sync-room-blocks',
    summary: 'Sync all room blocks for a wedding group (replaces existing with no bookings).',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @Post('/sync')
  async sync(
    @Param('groupUuid') groupUuid: string,
    @Body() roomBlocks: CreateRoomBlockDto[],
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupId = await this.roomBlocksService.getWeddingGroupIdByUuid(groupUuid);
      if (!groupId) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const created = await this.roomBlocksService.syncRoomBlocks(groupId, roomBlocks);
      return res.status(HttpStatus.OK).json({
        message: `Room blocks ${i18n.t('responses.updated')}`,
        data: created,
      });
    } catch (error) {
      console.error('Error syncing room blocks:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Create Room Block -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'create-room-block',
    summary: 'Create a new room block for a wedding group.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @Post('/')
  async create(
    @Param('groupUuid') groupUuid: string,
    @Body() createDto: CreateRoomBlockDto,
    @Res() res: Response,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
  ) {
    try {
      const groupId = await this.roomBlocksService.getWeddingGroupIdByUuid(groupUuid);
      if (!groupId) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const roomBlock = await this.roomBlocksService.create(groupId, createDto);

      // Log activity
      const admin = (req as any).user;
      await this.activityLogsService.logActivity({
        adminId: admin?.id,
        action: 'CREATE',
        entityType: 'room_block',
        entityId: roomBlock.uuid,
        entityName: `Room Block (${createDto.rooms_allocated} rooms)`,
        description: `Created room block for wedding group (${createDto.rooms_allocated} rooms at ${createDto.price_per_night}/night)`,
        ipAddress: ip,
        metadata: { wedding_group_uuid: groupUuid, rooms_allocated: createDto.rooms_allocated, price_per_night: createDto.price_per_night },
      });

      return res.status(HttpStatus.CREATED).json({
        message: `Room block ${i18n.t('responses.created')}`,
        data: roomBlock,
      });
    } catch (error) {
      console.error('Error creating room block:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Check Group Availability (BE-042) -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'check-group-availability',
    summary: 'Check room availability across all blocks in a wedding group.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse({
    description: 'Available room blocks with availability info',
  })
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @Get('/check-availability')
  async checkGroupAvailability(
    @Param('groupUuid') groupUuid: string,
    @Query('rooms_needed') roomsNeeded: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupId = await this.roomBlocksService.getWeddingGroupIdByUuid(groupUuid);
      if (!groupId) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const roomsRequired = roomsNeeded ? parseInt(roomsNeeded, 10) : 1;
      const availability = await this.roomBlocksService.checkGroupAvailability(groupId, roomsRequired);

      return res.status(HttpStatus.OK).json({
        message: 'Group availability check completed',
        data: availability,
      });
    } catch (error) {
      console.error('Error checking group availability:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Get Inventory Status (BE-043) -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-inventory-status',
    summary: 'Get full inventory tracking status for all room blocks in a wedding group.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse({
    description: 'Inventory status with all blocks and summary statistics',
  })
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @Get('/inventory')
  async getInventoryStatus(
    @Param('groupUuid') groupUuid: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupId = await this.roomBlocksService.getWeddingGroupIdByUuid(groupUuid);
      if (!groupId) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const inventory = await this.roomBlocksService.getInventoryStatus(groupId);

      return res.status(HttpStatus.OK).json({
        message: 'Inventory status retrieved successfully',
        data: inventory,
      });
    } catch (error) {
      console.error('Error getting inventory status:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Get All Room Blocks -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-room-blocks',
    summary: 'Get all room blocks for a wedding group.',
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
      const groupId = await this.roomBlocksService.getWeddingGroupIdByUuid(groupUuid);
      if (!groupId) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const roomBlocks = await this.roomBlocksService.findAllByWeddingGroupId(groupId);
      return res.status(HttpStatus.OK).json({
        message: `Room blocks ${i18n.t('responses.list')}`,
        data: roomBlocks,
      });
    } catch (error) {
      console.error('Error fetching room blocks:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Get Room Block Details -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-room-block-details',
    summary: 'Get room block details by UUID.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @ApiParam({ name: 'uuid', type: String, description: 'Room block UUID' })
  @Get('/:uuid')
  async findOne(
    @Param('groupUuid') groupUuid: string,
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupExists = await this.roomBlocksService.weddingGroupExists(groupUuid);
      if (!groupExists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const roomBlock = await this.roomBlocksService.findByUuid(uuid);
      if (!roomBlock) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Room block ${i18n.t('responses.not_found')}`,
        });
      }

      return res.status(HttpStatus.OK).json({
        message: `Room block ${i18n.t('responses.details')}`,
        data: roomBlock,
      });
    } catch (error) {
      console.error('Error fetching room block:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Update Room Block -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'update-room-block',
    summary: 'Update room block details.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @ApiParam({ name: 'uuid', type: String, description: 'Room block UUID' })
  @Patch('/:uuid')
  async update(
    @Param('groupUuid') groupUuid: string,
    @Param('uuid') uuid: string,
    @Body() updateDto: UpdateRoomBlockDto,
    @Res() res: Response,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
  ) {
    try {
      const groupExists = await this.roomBlocksService.weddingGroupExists(groupUuid);
      if (!groupExists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const existingBlock = await this.roomBlocksService.isExist(uuid);
      if (!existingBlock) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Room block ${i18n.t('responses.not_found')}`,
        });
      }

      // Validate that new allocation isn't less than booked
      if (updateDto.rooms_allocated !== undefined && updateDto.rooms_allocated < existingBlock.rooms_booked) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: `Cannot reduce allocation below booked rooms (${existingBlock.rooms_booked} already booked)`,
        });
      }

      await this.roomBlocksService.update(uuid, updateDto);

      // Log activity - detect if price changed
      const admin = (req as any).user;
      const isPriceChange = updateDto.price_per_night !== undefined && updateDto.price_per_night !== existingBlock.price_per_night;
      await this.activityLogsService.logActivity({
        adminId: admin?.id,
        action: isPriceChange ? 'PRICE_CHANGE' : 'UPDATE',
        entityType: 'room_block',
        entityId: uuid,
        entityName: `Room Block (${existingBlock.rooms_allocated} rooms)`,
        description: isPriceChange
          ? `Changed room block price from ${existingBlock.price_per_night} to ${updateDto.price_per_night}`
          : `Updated room block`,
        ipAddress: ip,
        metadata: {
          wedding_group_uuid: groupUuid,
          changes: Object.keys(updateDto),
          ...(isPriceChange && { old_price: existingBlock.price_per_night, new_price: updateDto.price_per_night }),
        },
      });

      return res.status(HttpStatus.OK).json({
        message: `Room block ${i18n.t('responses.updated')}`,
      });
    } catch (error) {
      console.error('Error updating room block:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Delete Room Block -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'delete-room-block',
    summary: 'Delete a room block (only if no bookings).',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @ApiParam({ name: 'uuid', type: String, description: 'Room block UUID' })
  @Delete('/:uuid')
  async delete(
    @Param('groupUuid') groupUuid: string,
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
  ) {
    try {
      const groupExists = await this.roomBlocksService.weddingGroupExists(groupUuid);
      if (!groupExists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const existingBlock = await this.roomBlocksService.isExist(uuid);
      if (!existingBlock) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Room block ${i18n.t('responses.not_found')}`,
        });
      }

      // Check if there are any bookings
      if (existingBlock.rooms_booked > 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: `Cannot delete room block with existing bookings (${existingBlock.rooms_booked} rooms booked)`,
        });
      }

      await this.roomBlocksService.delete(uuid);

      // Log activity
      const admin = (req as any).user;
      await this.activityLogsService.logActivity({
        adminId: admin?.id,
        action: 'DELETE',
        entityType: 'room_block',
        entityId: uuid,
        entityName: `Room Block (${existingBlock.rooms_allocated} rooms)`,
        description: `Deleted room block`,
        ipAddress: ip,
        metadata: { wedding_group_uuid: groupUuid },
      });

      return res.status(HttpStatus.OK).json({
        message: `Room block ${i18n.t('responses.deleted')}`,
      });
    } catch (error) {
      console.error('Error deleting room block:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Toggle Room Block Status -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'toggle-room-block-status',
    summary: 'Activate or deactivate a room block.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @ApiParam({ name: 'uuid', type: String, description: 'Room block UUID' })
  @Patch('/:uuid/status')
  async toggleStatus(
    @Param('groupUuid') groupUuid: string,
    @Param('uuid') uuid: string,
    @Body('is_active') isActive: boolean,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupExists = await this.roomBlocksService.weddingGroupExists(groupUuid);
      if (!groupExists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const existingBlock = await this.roomBlocksService.isExist(uuid);
      if (!existingBlock) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Room block ${i18n.t('responses.not_found')}`,
        });
      }

      await this.roomBlocksService.toggleStatus(uuid, isActive);
      return res.status(HttpStatus.OK).json({
        message: `Room block ${i18n.t('responses.status_change')}`,
      });
    } catch (error) {
      console.error('Error toggling room block status:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Get Available Rooms -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-available-rooms',
    summary: 'Get available rooms count for a room block.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', type: String, description: 'Wedding group UUID' })
  @ApiParam({ name: 'uuid', type: String, description: 'Room block UUID' })
  @Get('/:uuid/availability')
  async getAvailability(
    @Param('groupUuid') groupUuid: string,
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const groupExists = await this.roomBlocksService.weddingGroupExists(groupUuid);
      if (!groupExists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Wedding Group ${i18n.t('responses.not_found')}`,
        });
      }

      const existingBlock = await this.roomBlocksService.isExist(uuid);
      if (!existingBlock) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Room block ${i18n.t('responses.not_found')}`,
        });
      }

      const available = await this.roomBlocksService.getAvailableRooms(uuid);
      return res.status(HttpStatus.OK).json({
        message: 'Room block availability',
        data: {
          rooms_allocated: existingBlock.rooms_allocated,
          rooms_booked: existingBlock.rooms_booked,
          rooms_available: available,
        },
      });
    } catch (error) {
      console.error('Error getting room block availability:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }
}
