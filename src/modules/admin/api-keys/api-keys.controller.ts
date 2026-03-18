import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/decorators/require-permission.decorator';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/CreateApiKeyDto';
import { UpdateApiKeyDto } from './dto/UpdateApiKeyDto';
import { ApiKeyQueryDto } from './dto/ApiKeyQueryDto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@ApiTags('Admin - API Keys')
@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard, PermissionGuard)
@Controller('v1/admin/api-keys')
export class ApiKeysController {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all API keys' })
  @ApiResponse({ status: 200, description: 'List of API keys' })
  @RequirePermission('api-keys.view')
  async findAll(@Query() query: ApiKeyQueryDto) {
    return this.apiKeysService.getAllApiKeys(query);
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Get available permission scopes' })
  @ApiResponse({ status: 200, description: 'List of available permissions' })
  @RequirePermission('api-keys.view')
  getAvailablePermissions() {
    return this.apiKeysService.getAvailablePermissions();
  }

  @Get(':uuid')
  @ApiOperation({ summary: 'Get API key by UUID' })
  @ApiResponse({ status: 200, description: 'API key details' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  @RequirePermission('api-keys.view')
  async findOne(@Param('uuid') uuid: string) {
    return this.apiKeysService.getApiKeyByUuid(uuid);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({
    status: 201,
    description: 'API key created. The full key is returned only once.',
  })
  @RequirePermission('api-keys.create')
  async create(@Body() dto: CreateApiKeyDto, @Request() req: any, @Ip() ip: string) {
    const result = await this.apiKeysService.createApiKey(dto, req.user.id);

    // Log activity (security-sensitive)
    await this.activityLogsService.logActivity({
      adminId: req.user.id,
      action: 'CREATE',
      entityType: 'api_key',
      entityId: result.data.uuid,
      entityName: dto.name,
      description: `Created API key "${dto.name}"`,
      ipAddress: ip,
      metadata: { key_name: dto.name, permissions: dto.permissions },
    });

    return result;
  }

  @Patch(':uuid')
  @ApiOperation({ summary: 'Update an API key' })
  @ApiResponse({ status: 200, description: 'API key updated' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  @RequirePermission('api-keys.create')
  async update(@Param('uuid') uuid: string, @Body() dto: UpdateApiKeyDto) {
    return this.apiKeysService.updateApiKey(uuid, dto);
  }

  @Delete(':uuid')
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200, description: 'API key revoked' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  @RequirePermission('api-keys.delete')
  async revoke(@Param('uuid') uuid: string, @Request() req: any, @Ip() ip: string) {
    // Get key details before revoking for logging
    const keyDetails = await this.apiKeysService.getApiKeyByUuid(uuid);
    const result = await this.apiKeysService.revokeApiKey(uuid);

    // Log activity (security-sensitive)
    await this.activityLogsService.logActivity({
      adminId: req.user.id,
      action: 'REVOKE',
      entityType: 'api_key',
      entityId: uuid,
      entityName: keyDetails?.name || 'Unknown',
      description: `Revoked API key "${keyDetails?.name || 'Unknown'}"`,
      ipAddress: ip,
    });

    return result;
  }
}
