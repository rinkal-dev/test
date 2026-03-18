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
  ApiConflictResponse,
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
import { RoomTypesService } from './room-types.service';
import { CreateRoomTypeDto } from './dto/CreateRoomTypeDto';
import { UpdateRoomTypeDto } from './dto/UpdateRoomTypeDto';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { headers, response, tags } from 'src/swagger/Base';

@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@ApiHeaders([headers.accept, headers.accept_language])
@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiUnauthorizedResponse(response.unauthorized)
@ApiUnprocessableEntityResponse(response.validationException)
@ApiTags('Room Types')
@Controller({ version: '1', path: 'hotels/:hotelUuid/room-types' })
export class RoomTypesController {
  constructor(private readonly roomTypesService: RoomTypesService) {}

  // ------------------------------------------------------------- Sync Room Types (Bulk) - MUST BE BEFORE /:uuid routes -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'sync-room-types',
    summary: 'Sync all room types for a hotel (replaces existing).',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'hotelUuid', type: String })
  @Post('/sync')
  async sync(
    @Param('hotelUuid') hotelUuid: string,
    @Body() roomTypes: CreateRoomTypeDto[],
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      console.log('Sync room types called for hotel:', hotelUuid);
      console.log('Room types received:', JSON.stringify(roomTypes, null, 2));

      const hotelId = await this.roomTypesService.getHotelIdByUuid(hotelUuid);
      if (!hotelId) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Hotel ${i18n.t('responses.not_found')}`,
        });
      }

      const created = await this.roomTypesService.syncRoomTypes(hotelId, roomTypes);
      return res.status(HttpStatus.OK).json({
        message: `Room types ${i18n.t('responses.updated')}`,
        data: created,
      });
    } catch (error) {
      console.error('Error syncing room types:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Create Room Type -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'create-room-type',
    summary: 'Create a new room type for a hotel.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'hotelUuid', type: String })
  @Post('/')
  async create(
    @Param('hotelUuid') hotelUuid: string,
    @Body() createRoomTypeDto: CreateRoomTypeDto,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      // Check if hotel exists and get hotel ID
      const hotelId = await this.roomTypesService.getHotelIdByUuid(hotelUuid);
      if (!hotelId) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Hotel ${i18n.t('responses.not_found')}`,
        });
      }

      const roomType = await this.roomTypesService.create(hotelId, createRoomTypeDto);
      return res.status(HttpStatus.CREATED).json({
        message: `Room type ${i18n.t('responses.created')}`,
        data: roomType,
      });
    } catch (error) {
      console.error('Error creating room type:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Get All Room Types -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-room-types',
    summary: 'Get all room types for a hotel.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'hotelUuid', type: String })
  @Get('/')
  async findAll(
    @Param('hotelUuid') hotelUuid: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const hotelId = await this.roomTypesService.getHotelIdByUuid(hotelUuid);
      if (!hotelId) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Hotel ${i18n.t('responses.not_found')}`,
        });
      }

      const roomTypes = await this.roomTypesService.findAllByHotelId(hotelId);
      return res.status(HttpStatus.OK).json({
        message: `Room types ${i18n.t('responses.list')}`,
        data: roomTypes,
      });
    } catch (error) {
      console.error('Error fetching room types:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Get Room Type Details -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-room-type-details',
    summary: 'Get room type details by UUID.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'hotelUuid', type: String })
  @ApiParam({ name: 'uuid', type: String })
  @Get('/:uuid')
  async findOne(
    @Param('hotelUuid') hotelUuid: string,
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const hotelExists = await this.roomTypesService.hotelExists(hotelUuid);
      if (!hotelExists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Hotel ${i18n.t('responses.not_found')}`,
        });
      }

      const roomType = await this.roomTypesService.findByUuid(uuid);
      if (!roomType) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Room type ${i18n.t('responses.not_found')}`,
        });
      }

      return res.status(HttpStatus.OK).json({
        message: `Room type ${i18n.t('responses.details')}`,
        data: roomType,
      });
    } catch (error) {
      console.error('Error fetching room type:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Update Room Type -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'update-room-type',
    summary: 'Update room type details.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'hotelUuid', type: String })
  @ApiParam({ name: 'uuid', type: String })
  @Patch('/:uuid')
  async update(
    @Param('hotelUuid') hotelUuid: string,
    @Param('uuid') uuid: string,
    @Body() updateRoomTypeDto: UpdateRoomTypeDto,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const hotelExists = await this.roomTypesService.hotelExists(hotelUuid);
      if (!hotelExists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Hotel ${i18n.t('responses.not_found')}`,
        });
      }

      const existingRoomType = await this.roomTypesService.isExist(uuid);
      if (!existingRoomType) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Room type ${i18n.t('responses.not_found')}`,
        });
      }

      await this.roomTypesService.update(uuid, updateRoomTypeDto);
      return res.status(HttpStatus.OK).json({
        message: `Room type ${i18n.t('responses.updated')}`,
      });
    } catch (error) {
      console.error('Error updating room type:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Delete Room Type -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'delete-room-type',
    summary: 'Delete a room type.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'hotelUuid', type: String })
  @ApiParam({ name: 'uuid', type: String })
  @Delete('/:uuid')
  async delete(
    @Param('hotelUuid') hotelUuid: string,
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const hotelExists = await this.roomTypesService.hotelExists(hotelUuid);
      if (!hotelExists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Hotel ${i18n.t('responses.not_found')}`,
        });
      }

      const existingRoomType = await this.roomTypesService.isExist(uuid);
      if (!existingRoomType) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Room type ${i18n.t('responses.not_found')}`,
        });
      }

      await this.roomTypesService.delete(uuid);
      return res.status(HttpStatus.OK).json({
        message: `Room type ${i18n.t('responses.deleted')}`,
      });
    } catch (error) {
      console.error('Error deleting room type:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

}
