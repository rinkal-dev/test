import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  Req,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeaders,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AdminGuestFlightsService } from './admin-guest-flights.service';
import { FlightQueryDto, UpdateTransferDto, AdminUpdateFlightDto } from './dto';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/decorators/require-permission.decorator';
import { headers, response } from 'src/swagger/Base';
import { getDataFilterAdminId, hasFullDataAccess } from 'src/helpers/data-ownership.helper';

@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard, PermissionGuard)
@ApiHeaders([headers.accept, headers.accept_language])
@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiUnauthorizedResponse(response.unauthorized)
@ApiTags('Admin Guest Flights')
@Controller({ version: '1', path: 'guest-flights' })
export class AdminGuestFlightsController {
  constructor(private readonly flightsService: AdminGuestFlightsService) {}

  // ------------------------------------------------------------- List All Flights -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-all-guest-flights',
    summary: 'Get all guest flights with pagination and filters',
  })
  @ApiOkResponse(response.ok)
  @RequirePermission('flights.view')
  @Get('/')
  async findAll(@Query() query: FlightQueryDto, @Req() req: Request, @Res() res: Response) {
    try {
      const admin = req.user as any;
      const filterAdminId = getDataFilterAdminId(admin);
      const result = await this.flightsService.findAll(query, filterAdminId);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Get Flights by Wedding Group -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-flights-by-group',
    summary: 'Get guest flights for a specific wedding group',
  })
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', description: 'Wedding group UUID' })
  @RequirePermission('flights.view')
  @Get('/group/:groupUuid')
  async findByWeddingGroup(
    @Param('groupUuid') groupUuid: string,
    @Query() query: FlightQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const admin = req.user as any;
      const filterAdminId = getDataFilterAdminId(admin);
      const result = await this.flightsService.findByWeddingGroup(groupUuid, query, filterAdminId);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Get Group Flight Stats -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-group-flight-stats',
    summary: 'Get flight statistics for a wedding group',
  })
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', description: 'Wedding group UUID' })
  @RequirePermission('flights.view')
  @Get('/group/:groupUuid/stats')
  async getGroupStats(@Param('groupUuid') groupUuid: string, @Req() req: Request, @Res() res: Response) {
    try {
      const admin = req.user as any;
      const filterAdminId = getDataFilterAdminId(admin);
      const stats = await this.flightsService.getGroupStats(groupUuid, filterAdminId);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Export Group Flights -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'export-group-flights',
    summary: 'Export all flights for a wedding group (for transport coordination)',
  })
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'groupUuid', description: 'Wedding group UUID' })
  @RequirePermission('flights.export')
  @Get('/group/:groupUuid/export')
  async exportGroupFlights(@Param('groupUuid') groupUuid: string, @Req() req: Request, @Res() res: Response) {
    try {
      const admin = req.user as any;
      const filterAdminId = getDataFilterAdminId(admin);
      // Verify admin has access to this group before exporting
      const stats = await this.flightsService.getGroupStats(groupUuid, filterAdminId);
      if (stats.total_flights === 0) {
        // Check if it's because no access or no flights
        const fullStats = await this.flightsService.getGroupStats(groupUuid, null);
        if (fullStats.total_flights > 0 && !hasFullDataAccess(admin)) {
          return res.status(HttpStatus.FORBIDDEN).json({
            success: false,
            message: 'You do not have access to this wedding group',
          });
        }
      }
      const data = await this.flightsService.exportGroupFlights(groupUuid);
      return res.status(HttpStatus.OK).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Get Single Flight -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-guest-flight',
    summary: 'Get guest flight details by UUID',
  })
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', description: 'Flight UUID' })
  @RequirePermission('flights.view')
  @Get('/:uuid')
  async findOne(@Param('uuid') uuid: string, @Req() req: Request, @Res() res: Response) {
    try {
      const admin = req.user as any;
      const flight = await this.flightsService.findOne(uuid);

      // Check if admin has access to this flight's wedding group
      if (!hasFullDataAccess(admin) && flight.booking?.wedding_group?.created_by !== admin.id) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: 'You do not have access to this flight record',
        });
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        data: flight,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Update Transfer Status -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'update-transfer-status',
    summary: 'Update transfer status for a flight',
  })
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', description: 'Flight UUID' })
  @RequirePermission('flights.edit')
  @Patch('/:uuid/transfer')
  async updateTransferStatus(
    @Param('uuid') uuid: string,
    @Body() dto: UpdateTransferDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const admin = req.user as any;
      const existingFlight = await this.flightsService.findOne(uuid);

      // Check if admin has access to this flight's wedding group
      if (!hasFullDataAccess(admin) && existingFlight.booking?.wedding_group?.created_by !== admin.id) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: 'You do not have access to update this flight record',
        });
      }

      const flight = await this.flightsService.updateTransferStatus(uuid, dto);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Transfer status updated successfully',
        data: flight,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Update Flight Details (Full Edit) -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'update-flight-details',
    summary: 'Update all flight details (admin full edit on behalf of guest)',
    description: 'Admin can edit any flight field without restrictions. Use this when guest contacts admin to make changes.',
  })
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', description: 'Flight UUID' })
  @RequirePermission('flights.edit')
  @Patch('/:uuid')
  async updateFlightDetails(
    @Param('uuid') uuid: string,
    @Body() dto: AdminUpdateFlightDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const admin = req.user as any;
      const existingFlight = await this.flightsService.findOne(uuid);

      // Check if admin has access to this flight's wedding group
      if (!hasFullDataAccess(admin) && existingFlight.booking?.wedding_group?.created_by !== admin.id) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: 'You do not have access to update this flight record',
        });
      }

      const flight = await this.flightsService.updateFlightDetails(uuid, dto);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Flight details updated successfully',
        data: flight,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Bulk Update Transfer Status -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'bulk-update-transfer-status',
    summary: 'Bulk update transfer status for multiple flights',
  })
  @ApiOkResponse(response.ok)
  @RequirePermission('flights.edit')
  @Post('/bulk-update')
  async bulkUpdateTransferStatus(
    @Body() body: { uuids: string[]; status: UpdateTransferDto },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const admin = req.user as any;

      // For bulk update, check access to all flights first
      if (!hasFullDataAccess(admin)) {
        for (const uuid of body.uuids) {
          const flight = await this.flightsService.findOne(uuid);
          if (flight.booking?.wedding_group?.created_by !== admin.id) {
            return res.status(HttpStatus.FORBIDDEN).json({
              success: false,
              message: `You do not have access to update flight ${uuid}`,
            });
          }
        }
      }

      const result = await this.flightsService.bulkUpdateTransferStatus(body.uuids, body.status);
      return res.status(HttpStatus.OK).json({
        success: true,
        ...result,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }
}
