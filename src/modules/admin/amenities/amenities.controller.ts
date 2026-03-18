import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  Res,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiHeaders,
  ApiInternalServerErrorResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { getDataFilterAdminId, hasFullDataAccess } from 'src/helpers/data-ownership.helper';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/decorators/require-permission.decorator';
import { headers, response } from 'src/swagger/Base';
import { AmenitiesService } from './amenities.service';
import { CreateAmenityDto, UpdateAmenityDto, AmenityQueryDto } from './dto';

@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard, PermissionGuard)
@ApiHeaders([headers.accept, headers.accept_language])
@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiUnauthorizedResponse(response.unauthorized)
@ApiUnprocessableEntityResponse(response.validationException)
@ApiTags('Amenities')
@Controller({ version: '1', path: 'amenities' })
export class AmenitiesController {
  constructor(private readonly amenitiesService: AmenitiesService) {}

  @RequirePermission('amenities.view')
  @Get()
  @ApiOperation({ summary: 'Get all amenities with pagination' })
  @ApiOkResponse({ description: 'Returns paginated list of amenities' })
  async findAll(@Query() query: AmenityQueryDto, @Res() res: Response, @Req() req: Request) {
    const admin = req.user as any;
    const filterAdminId = getDataFilterAdminId(admin);
    const result = await this.amenitiesService.findAll(query, filterAdminId);
    return res.status(HttpStatus.OK).json({
      message: 'Amenities retrieved successfully',
      data: result,
    });
  }

  @RequirePermission('amenities.view')
  @Get('active')
  @ApiOperation({ summary: 'Get all active amenities (for dropdowns). Returns shared amenities (created by Super Admin/Developer) + own amenities.' })
  @ApiOkResponse({ description: 'Returns list of active amenities' })
  async findAllActive(@Res() res: Response, @Req() req: Request) {
    const admin = req.user as any;
    const fullAccess = hasFullDataAccess(admin);
    const amenities = await this.amenitiesService.findAllActive(fullAccess, admin.id);
    return res.status(HttpStatus.OK).json({
      message: 'Active amenities retrieved successfully',
      data: amenities,
    });
  }

  @RequirePermission('amenities.view')
  @Get('categories')
  @ApiOperation({ summary: 'Get all amenity categories (from database)' })
  @ApiOkResponse({ description: 'Returns list of unique categories in use' })
  async getCategories(@Res() res: Response) {
    const categories = await this.amenitiesService.getCategories();
    return res.status(HttpStatus.OK).json({
      message: 'Categories retrieved successfully',
      data: categories,
    });
  }

  @RequirePermission('amenities.view')
  @Get('categories/config')
  @ApiOperation({ summary: 'Get all configured amenity categories (for dropdowns)' })
  @ApiOkResponse({ description: 'Returns list of all available categories with labels and icons' })
  async getConfiguredCategories(@Res() res: Response) {
    const categories = this.amenitiesService.getConfiguredCategories();
    return res.status(HttpStatus.OK).json({
      message: 'Configured categories retrieved successfully',
      data: categories,
    });
  }

  @RequirePermission('amenities.view')
  @Get(':uuid')
  @ApiOperation({ summary: 'Get a single amenity by UUID' })
  @ApiOkResponse({ description: 'Returns amenity details' })
  @ApiNotFoundResponse({ description: 'Amenity not found' })
  async findOne(@Param('uuid') uuid: string, @Res() res: Response, @Req() req: Request) {
    const admin = req.user as any;
    const amenity = await this.amenitiesService.findOne(uuid);

    // Check if admin has access to this amenity
    if (!hasFullDataAccess(admin) && amenity.created_by !== admin.id) {
      return res.status(HttpStatus.FORBIDDEN).json({
        message: 'You do not have access to this amenity',
      });
    }

    return res.status(HttpStatus.OK).json({
      message: 'Amenity retrieved successfully',
      data: amenity,
    });
  }

  @RequirePermission('amenities.create')
  @Post()
  @ApiOperation({ summary: 'Create a new amenity' })
  @ApiOkResponse({ description: 'Amenity created successfully' })
  @ApiConflictResponse({ description: 'Amenity with this name already exists' })
  async create(@Body() dto: CreateAmenityDto, @Res() res: Response, @Req() req: Request) {
    const admin = req.user as any;
    const amenity = await this.amenitiesService.create(dto, admin.id);
    return res.status(HttpStatus.CREATED).json({
      message: 'Amenity created successfully',
      data: amenity,
    });
  }

  @RequirePermission('amenities.edit')
  @Put(':uuid')
  @ApiOperation({ summary: 'Update an amenity' })
  @ApiOkResponse({ description: 'Amenity updated successfully' })
  @ApiNotFoundResponse({ description: 'Amenity not found' })
  @ApiConflictResponse({ description: 'Amenity with this name already exists' })
  async update(@Param('uuid') uuid: string, @Body() dto: UpdateAmenityDto, @Res() res: Response, @Req() req: Request) {
    const admin = req.user as any;

    // Check ownership before updating
    const existing = await this.amenitiesService.findOne(uuid);
    if (!hasFullDataAccess(admin) && existing.created_by !== admin.id) {
      return res.status(HttpStatus.FORBIDDEN).json({
        message: 'You do not have access to update this amenity',
      });
    }

    const amenity = await this.amenitiesService.update(uuid, dto);
    return res.status(HttpStatus.OK).json({
      message: 'Amenity updated successfully',
      data: amenity,
    });
  }

  @RequirePermission('amenities.delete')
  @Delete(':uuid')
  @ApiOperation({ summary: 'Delete an amenity' })
  @ApiOkResponse({ description: 'Amenity deleted successfully' })
  @ApiNotFoundResponse({ description: 'Amenity not found' })
  @ApiConflictResponse({ description: 'Cannot delete - amenity is in use' })
  async remove(@Param('uuid') uuid: string, @Res() res: Response, @Req() req: Request) {
    const admin = req.user as any;

    // Check ownership before deleting
    const existing = await this.amenitiesService.findOne(uuid);
    if (!hasFullDataAccess(admin) && existing.created_by !== admin.id) {
      return res.status(HttpStatus.FORBIDDEN).json({
        message: 'You do not have access to delete this amenity',
      });
    }

    const result = await this.amenitiesService.remove(uuid);
    return res.status(HttpStatus.OK).json(result);
  }
}
