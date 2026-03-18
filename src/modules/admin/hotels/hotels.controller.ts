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
  UseInterceptors,
  UploadedFile,
  ForbiddenException,
  Ip,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import {
  ApiBadRequestResponse,
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
import { Response, Request } from 'express';
import { HotelsService } from './hotels.service';
import { getDataFilterAdminId, hasFullDataAccess } from 'src/helpers/data-ownership.helper';
import { CreateHotelDto } from './dto/CreateHotelDto';
import { UpdateHotelDto } from './dto/UpdateHotelDto';
import { HotelQueryDto } from './dto/HotelQueryDto';
import { SmartImportDto } from './dto/SmartImportDto';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/decorators/require-permission.decorator';
import { headers, response, tags } from 'src/swagger/Base';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard, PermissionGuard)
@ApiHeaders([headers.accept, headers.accept_language])
@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiUnauthorizedResponse(response.unauthorized)
@ApiUnprocessableEntityResponse(response.validationException)
@ApiTags(tags.HOTELS || 'Hotels')
@Controller({ version: '1', path: 'hotels' })
export class HotelsController {
  constructor(
    private readonly hotelsService: HotelsService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  // ------------------------------------------------------------- Create Hotel -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'create-hotel',
    summary: 'Create a new hotel.',
  })
  @ApiConflictResponse(response.conflict)
  @ApiOkResponse(response.ok)
  @RequirePermission('hotels.create')
  @Post('/')
  async create(
    @Body() createHotelDto: CreateHotelDto,
    @Res() res: Response,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
  ) {
    try {
      const admin = req.user as any;

      // Check if slug already exists
      const slugExists = await this.hotelsService.isSlugExists(createHotelDto.slug);
      if (slugExists) {
        return res.status(HttpStatus.CONFLICT).json({
          message: `Slug ${i18n.t('responses.already_exist')}`,
        });
      }

      const hotel = await this.hotelsService.create(createHotelDto, admin.id);

      // Log activity
      await this.activityLogsService.logActivity({
        adminId: admin.id,
        action: 'CREATE',
        entityType: 'hotel',
        entityId: hotel.uuid,
        entityName: createHotelDto.name,
        description: `Created hotel "${createHotelDto.name}"`,
        ipAddress: ip,
        metadata: { hotel_name: createHotelDto.name, slug: createHotelDto.slug },
      });

      return res.status(HttpStatus.CREATED).json({
        message: `Hotel ${i18n.t('responses.created')}`,
        data: hotel,
      });
    } catch (error) {
      console.error('Error creating hotel:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Get All Hotels -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-all-hotels',
    summary: 'Get all hotels with pagination and filters.',
  })
  @ApiOkResponse(response.ok)
  @RequirePermission('hotels.view')
  @Get('/')
  async findAll(
    @Query() query: HotelQueryDto,
    @Res() res: Response,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const admin = req.user as any;
      const filterAdminId = getDataFilterAdminId(admin);
      const { count, rows: hotels } = await this.hotelsService.findAll(query, filterAdminId);
      return res.status(HttpStatus.OK).json({
        message: `Hotels ${i18n.t('responses.list')}`,
        data: {
          total_count: count,
          page: query.page || 1,
          limit: query.limit || 10,
          hotels,
        },
      });
    } catch (error) {
      console.error('Error fetching hotels:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Search Hotels -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'search-hotels',
    summary: 'Search hotels by name, city, or country.',
  })
  @ApiOkResponse(response.ok)
  @RequirePermission('hotels.view')
  @Get('/search')
  async search(
    @Query('q') searchQuery: string,
    @Query('limit') limit: number,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      if (!searchQuery) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Search query is required',
        });
      }

      const hotels = await this.hotelsService.search(searchQuery, limit || 10);
      return res.status(HttpStatus.OK).json({
        message: `Hotels ${i18n.t('responses.list')}`,
        data: hotels,
      });
    } catch (error) {
      console.error('Error searching hotels:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Get All Active Hotels (for dropdowns) -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-all-active-hotels',
    summary: 'Get all active hotels for dropdown selection. Returns shared hotels (created by Super Admin/Developer) + own hotels.',
  })
  @ApiOkResponse(response.ok)
  @RequirePermission('hotels.view')
  @Get('/active')
  async findAllActive(
    @Res() res: Response,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const admin = req.user as any;
      const fullAccess = hasFullDataAccess(admin);
      const hotels = await this.hotelsService.findAllActive(fullAccess, admin.id);
      return res.status(HttpStatus.OK).json({
        message: `Active hotels ${i18n.t('responses.list')}`,
        data: hotels,
      });
    } catch (error) {
      console.error('Error fetching active hotels:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Download Import Template -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'download-import-template',
    summary: 'Download Excel template for bulk hotel import.',
  })
  @ApiOkResponse({
    description: 'Excel template file',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  @RequirePermission('hotels.import')
  @Get('/import/template')
  async downloadImportTemplate(@Res() res: Response) {
    try {
      const buffer = this.hotelsService.generateImportTemplate();

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=hotel-import-template.xlsx',
      );

      return res.send(buffer);
    } catch (error) {
      console.error('Template generation error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to generate template',
      });
    }
  }

  // ------------------------------------------------------------- Validate Import (Step 1) -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'validate-import',
    summary: 'Validate import file and return preview (Step 1 of import process).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBadRequestResponse(response.badRequest)
  @ApiOkResponse(response.ok)
  @RequirePermission('hotels.import')
  @UseInterceptors(FileInterceptor('file'))
  @Post('/import/validate')
  async validateImport(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    try {
      // Validate file
      if (!file) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Please upload a file',
        });
      }

      // Check file type
      const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv', // .csv
        'application/csv',
      ];

      const allowedExtensions = ['.xlsx', '.xls', '.csv'];
      const fileExtension = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();

      if (!allowedMimeTypes.includes(file.mimetype) && !allowedExtensions.includes(fileExtension)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file.',
        });
      }

      // Validate and get preview
      const result = await this.hotelsService.validateImport(file.buffer);

      return res.status(HttpStatus.OK).json({
        message: result.canImport
          ? `Found ${result.summary.hotelsFound} hotels with ${result.summary.roomTypesFound} room types. Ready to import.`
          : `Validation failed. Please fix ${result.summary.errors} error(s) and try again.`,
        data: result,
      });
    } catch (error) {
      console.error('Validate import error:', error);
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message || 'Failed to validate file. Please check the format and try again.',
      });
    }
  }

  // ------------------------------------------------------------- Confirm Import (Step 2) -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'confirm-import',
    summary: 'Confirm and execute import (Step 2 of import process).',
  })
  @ApiBadRequestResponse(response.badRequest)
  @ApiOkResponse(response.ok)
  @RequirePermission('hotels.import')
  @Post('/import/confirm')
  async confirmImport(
    @Body('parsedDataToken') parsedDataToken: string,
    @Res() res: Response,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
  ) {
    try {
      if (!parsedDataToken) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Missing parsed data token. Please validate the file first.',
        });
      }

      // Execute import with admin ID for ownership tracking
      const admin = req.user as any;
      const result = await this.hotelsService.confirmImport(parsedDataToken, admin.id);

      // Log activity for bulk import
      const hotelNames = result.importedHotels?.map((h: any) => h.name).join(', ') || '';
      await this.activityLogsService.logActivity({
        adminId: admin.id,
        action: 'IMPORT',
        entityType: 'hotel',
        entityId: 'bulk-import',
        entityName: hotelNames || 'Bulk Import',
        description: `Imported ${result.hotelsCreated} hotel(s) with ${result.roomTypesCreated} room type(s)`,
        ipAddress: ip,
        metadata: {
          hotels_created: result.hotelsCreated,
          room_types_created: result.roomTypesCreated,
          hotel_names: hotelNames,
          imported_hotels: result.importedHotels?.map((h: any) => ({ uuid: h.uuid, name: h.name })),
        },
      });

      return res.status(HttpStatus.CREATED).json({
        message: `Successfully imported ${result.hotelsCreated} hotels with ${result.roomTypesCreated} room types.`,
        data: result,
      });
    } catch (error) {
      console.error('Confirm import error:', error);
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message || 'Failed to import. Please try again.',
      });
    }
  }

  // ------------------------------------------------------------- Get Hotel by UUID -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-hotel-details',
    summary: 'Get hotel details by UUID.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', type: String })
  @RequirePermission('hotels.view')
  @Get('/:uuid')
  async findOne(
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const admin = req.user as any;
      const hotel = await this.hotelsService.findByUuid(uuid);
      if (!hotel) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Hotel ${i18n.t('responses.not_found')}`,
        });
      }

      // Check if admin has access to this hotel
      if (!hasFullDataAccess(admin) && hotel.created_by !== admin.id) {
        return res.status(HttpStatus.FORBIDDEN).json({
          message: 'You do not have access to this hotel',
        });
      }

      return res.status(HttpStatus.OK).json({
        message: `Hotel ${i18n.t('responses.details')}`,
        data: hotel,
      });
    } catch (error) {
      console.error('Error fetching hotel:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Get Hotel by Slug -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'get-hotel-by-slug',
    summary: 'Get hotel details by slug.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'slug', type: String })
  @RequirePermission('hotels.view')
  @Get('/slug/:slug')
  async findBySlug(
    @Param('slug') slug: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const hotel = await this.hotelsService.findBySlug(slug);
      if (!hotel) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Hotel ${i18n.t('responses.not_found')}`,
        });
      }

      return res.status(HttpStatus.OK).json({
        message: `Hotel ${i18n.t('responses.details')}`,
        data: hotel,
      });
    } catch (error) {
      console.error('Error fetching hotel:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Update Hotel -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'update-hotel',
    summary: 'Update hotel details.',
  })
  @ApiConflictResponse(response.conflict)
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', type: String })
  @RequirePermission('hotels.edit')
  @Patch('/:uuid')
  async update(
    @Param('uuid') uuid: string,
    @Body() updateHotelDto: UpdateHotelDto,
    @Res() res: Response,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
  ) {
    try {
      const admin = req.user as any;

      // Check if hotel exists
      const existingHotel = await this.hotelsService.findByUuid(uuid);
      if (!existingHotel) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Hotel ${i18n.t('responses.not_found')}`,
        });
      }

      // Check if admin has access to this hotel
      if (!hasFullDataAccess(admin) && existingHotel.created_by !== admin.id) {
        return res.status(HttpStatus.FORBIDDEN).json({
          message: 'You do not have access to update this hotel',
        });
      }

      // Check if slug already exists (if updating slug)
      if (updateHotelDto.slug && updateHotelDto.slug !== existingHotel.slug) {
        const slugExists = await this.hotelsService.isSlugExists(updateHotelDto.slug, uuid);
        if (slugExists) {
          return res.status(HttpStatus.CONFLICT).json({
            message: `Slug ${i18n.t('responses.already_exist')}`,
          });
        }
      }

      await this.hotelsService.update(uuid, updateHotelDto);

      // Log activity
      await this.activityLogsService.logActivity({
        adminId: admin.id,
        action: 'UPDATE',
        entityType: 'hotel',
        entityId: uuid,
        entityName: existingHotel.name,
        description: `Updated hotel "${existingHotel.name}"`,
        ipAddress: ip,
        metadata: { changes: Object.keys(updateHotelDto) },
      });

      return res.status(HttpStatus.OK).json({
        message: `Hotel ${i18n.t('responses.updated')}`,
      });
    } catch (error) {
      console.error('Error updating hotel:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Delete Hotel -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'delete-hotel',
    summary: 'Delete a hotel.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', type: String })
  @RequirePermission('hotels.delete')
  @Delete('/:uuid')
  async delete(
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
  ) {
    try {
      const admin = req.user as any;

      const existingHotel = await this.hotelsService.findByUuid(uuid);
      if (!existingHotel) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Hotel ${i18n.t('responses.not_found')}`,
        });
      }

      // Check if admin has access to this hotel
      if (!hasFullDataAccess(admin) && existingHotel.created_by !== admin.id) {
        return res.status(HttpStatus.FORBIDDEN).json({
          message: 'You do not have access to delete this hotel',
        });
      }

      await this.hotelsService.delete(uuid);

      // Log activity
      await this.activityLogsService.logActivity({
        adminId: admin.id,
        action: 'DELETE',
        entityType: 'hotel',
        entityId: uuid,
        entityName: existingHotel.name,
        description: `Deleted hotel "${existingHotel.name}"`,
        ipAddress: ip,
      });

      return res.status(HttpStatus.OK).json({
        message: `Hotel ${i18n.t('responses.deleted')}`,
      });
    } catch (error) {
      console.error('Error deleting hotel:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Toggle Hotel Status -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'toggle-hotel-status',
    summary: 'Activate or deactivate a hotel.',
  })
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', type: String })
  @RequirePermission('hotels.edit')
  @Patch('/:uuid/status')
  async toggleStatus(
    @Param('uuid') uuid: string,
    @Body('is_active') is_active: boolean,
    @Res() res: Response,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const admin = req.user as any;

      const existingHotel = await this.hotelsService.findByUuid(uuid);
      if (!existingHotel) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: `Hotel ${i18n.t('responses.not_found')}`,
        });
      }

      // Check if admin has access to this hotel
      if (!hasFullDataAccess(admin) && existingHotel.created_by !== admin.id) {
        return res.status(HttpStatus.FORBIDDEN).json({
          message: 'You do not have access to update this hotel',
        });
      }

      const [updated] = await this.hotelsService.changeStatus(uuid, is_active);
      if (!updated) {
        return res.status(HttpStatus.OK).json({
          message: `Hotel ${i18n.t('responses.status_not_change')}`,
        });
      }

      return res.status(HttpStatus.OK).json({
        message: `Hotel ${i18n.t('responses.status_change')}`,
      });
    } catch (error) {
      console.error('Error toggling hotel status:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Check Slug Availability -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'check-slug-availability',
    summary: 'Check if a hotel slug is available.',
  })
  @ApiOkResponse(response.ok)
  @RequirePermission('hotels.view')
  @Get('/check-slug/:slug')
  async checkSlug(
    @Param('slug') slug: string,
    @Query('exclude') excludeUuid: string,
    @Res() res: Response,
  ) {
    try {
      const exists = await this.hotelsService.isSlugExists(slug, excludeUuid);
      return res.status(HttpStatus.OK).json({
        available: !exists,
        slug,
      });
    } catch (error) {
      console.error('Error checking slug:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message,
      });
    }
  }

  // ------------------------------------------------------------- Smart Import -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'smart-import-hotel',
    summary: 'Import hotel data from a website URL using AI.',
  })
  @ApiBadRequestResponse(response.badRequest)
  @ApiOkResponse(response.ok)
  @RequirePermission('hotels.import')
  @Post('/smart-import')
  async smartImport(
    @Body() smartImportDto: SmartImportDto,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const result = await this.hotelsService.smartImport(smartImportDto.url);

      if (!result || !result.data) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Could not extract hotel data from the provided URL. Please check the URL and try again.',
        });
      }

      // Different messages based on whether data is real or estimated
      const message = result.isEstimated
        ? 'Hotel data estimated using AI (website not accessible). Please review and verify all details.'
        : 'Hotel data imported from website successfully. Please review and add images.';

      return res.status(HttpStatus.OK).json({
        message,
        data: result.data,
        isEstimated: result.isEstimated,
      });
    } catch (error) {
      console.error('Smart Import Error:', error);

      // Handle specific errors
      if (error.message === 'Gemini API Key is not configured') {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          message: 'AI service is not configured. Please contact administrator.',
        });
      }

      return res.status(HttpStatus.BAD_REQUEST).json({
        message: error.message || 'Failed to import hotel data. Please try again or enter details manually.',
      });
    }
  }
}
