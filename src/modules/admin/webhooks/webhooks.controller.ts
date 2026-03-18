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
import { WebhooksService } from './webhooks.service';
import { WebhookDispatcherService } from 'src/modules/webhooks/webhook-dispatcher.service';
import { CreateWebhookDto } from './dto/CreateWebhookDto';
import { UpdateWebhookDto } from './dto/UpdateWebhookDto';
import { WebhookQueryDto, DeliveryLogQueryDto } from './dto/WebhookQueryDto';

@ApiTags('Admin - Webhooks')
@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard, PermissionGuard)
@Controller('v1/admin/webhooks')
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly webhookDispatcher: WebhookDispatcherService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all webhooks' })
  @ApiResponse({ status: 200, description: 'List of webhooks' })
  @RequirePermission('webhooks.view')
  async findAll(@Query() query: WebhookQueryDto) {
    return this.webhooksService.getAllWebhooks(query);
  }

  @Get('events')
  @ApiOperation({ summary: 'Get available events for subscription' })
  @ApiResponse({ status: 200, description: 'List of available events' })
  @RequirePermission('webhooks.view')
  getAvailableEvents() {
    return this.webhooksService.getAvailableEvents();
  }

  @Get(':uuid')
  @ApiOperation({ summary: 'Get webhook by UUID' })
  @ApiResponse({ status: 200, description: 'Webhook details' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @RequirePermission('webhooks.view')
  async findOne(@Param('uuid') uuid: string) {
    const webhook = await this.webhooksService.getWebhookByUuid(uuid);
    return { data: webhook };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new webhook' })
  @ApiResponse({ status: 201, description: 'Webhook created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @RequirePermission('webhooks.create')
  async create(@Body() dto: CreateWebhookDto, @Request() req: any) {
    const webhook = await this.webhooksService.createWebhook(dto, req.user.id);
    return { data: webhook };
  }

  @Patch(':uuid')
  @ApiOperation({ summary: 'Update a webhook' })
  @ApiResponse({ status: 200, description: 'Webhook updated successfully' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @RequirePermission('webhooks.edit')
  async update(@Param('uuid') uuid: string, @Body() dto: UpdateWebhookDto) {
    const webhook = await this.webhooksService.updateWebhook(uuid, dto);
    return { data: webhook };
  }

  @Delete(':uuid')
  @ApiOperation({ summary: 'Delete a webhook' })
  @ApiResponse({ status: 200, description: 'Webhook deleted successfully' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @RequirePermission('webhooks.delete')
  async remove(@Param('uuid') uuid: string) {
    return this.webhooksService.deleteWebhook(uuid);
  }

  @Post(':uuid/regenerate-secret')
  @ApiOperation({ summary: 'Regenerate webhook secret key' })
  @ApiResponse({ status: 200, description: 'Secret key regenerated' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @RequirePermission('webhooks.edit')
  async regenerateSecret(@Param('uuid') uuid: string) {
    return this.webhooksService.regenerateSecretKey(uuid);
  }

  @Post(':uuid/test')
  @ApiOperation({ summary: 'Send test event to webhook' })
  @ApiResponse({ status: 200, description: 'Test event result' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @RequirePermission('webhooks.edit')
  async testWebhook(@Param('uuid') uuid: string) {
    const webhook = await this.webhooksService.getWebhookByUuid(uuid);
    return this.webhookDispatcher.sendTestEvent(webhook.id);
  }

  @Get(':uuid/logs')
  @ApiOperation({ summary: 'Get webhook delivery logs' })
  @ApiResponse({ status: 200, description: 'Delivery logs' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @RequirePermission('webhooks.view')
  async getDeliveryLogs(
    @Param('uuid') uuid: string,
    @Query() query: DeliveryLogQueryDto,
  ) {
    return this.webhooksService.getDeliveryLogs(uuid, query);
  }

  @Get(':uuid/stats')
  @ApiOperation({ summary: 'Get webhook delivery statistics' })
  @ApiResponse({ status: 200, description: 'Delivery statistics' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @RequirePermission('webhooks.view')
  async getDeliveryStats(@Param('uuid') uuid: string) {
    return this.webhooksService.getDeliveryStats(uuid);
  }
}
