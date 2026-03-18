import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import {
  WEBHOOKS_REPOSITORY,
  WEBHOOK_DELIVERY_LOGS_REPOSITORY,
} from 'src/config/constants';
import { Webhooks, WebhookDeliveryLogs, Admins } from 'src/models';
import { CreateWebhookDto } from './dto/CreateWebhookDto';
import { UpdateWebhookDto } from './dto/UpdateWebhookDto';
import { WebhookQueryDto, DeliveryLogQueryDto } from './dto/WebhookQueryDto';
import {
  EventType,
  EVENT_DESCRIPTIONS,
  EVENT_CATEGORIES,
} from 'src/modules/events/event-types';

@Injectable()
export class WebhooksService {
  constructor(
    @Inject(WEBHOOKS_REPOSITORY)
    private webhooksRepository: typeof Webhooks,
    @Inject(WEBHOOK_DELIVERY_LOGS_REPOSITORY)
    private deliveryLogsRepository: typeof WebhookDeliveryLogs,
  ) {}

  /**
   * Generate a random secret key for webhook signing
   */
  private generateSecretKey(): string {
    return `whsec_${crypto.randomBytes(24).toString('hex')}`;
  }

  /**
   * Get all webhooks with pagination
   */
  async getAllWebhooks(queries: WebhookQueryDto) {
    const page = Number(queries.page) || 1;
    const limit = Number(queries.limit) || 10;
    const offset = (page - 1) * limit;

    const where: any = {};

    if (queries.is_active !== undefined) {
      where.is_active = queries.is_active;
    }

    if (queries.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${queries.search}%` } },
        { url: { [Op.iLike]: `%${queries.search}%` } },
      ];
    }

    const sortBy = queries.sort_by || 'created_at';
    const sortOrder = queries.sort_order || 'DESC';

    const { rows, count } = await this.webhooksRepository.findAndCountAll({
      where,
      include: [
        {
          model: Admins,
          as: 'created_by_admin',
          attributes: ['uuid', 'name', 'email'],
        },
      ],
      order: [[sortBy, sortOrder]],
      offset,
      limit,
    });

    return {
      data: rows,
      meta: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Get available events for subscription
   */
  getAvailableEvents() {
    return Object.entries(EVENT_CATEGORIES).map(([category, events]) => ({
      category,
      events: events.map((event) => ({
        event,
        description: EVENT_DESCRIPTIONS[event],
      })),
    }));
  }

  /**
   * Get a single webhook by UUID
   */
  async getWebhookByUuid(uuid: string) {
    const webhook = await this.webhooksRepository.findOne({
      where: { uuid },
      include: [
        {
          model: Admins,
          as: 'created_by_admin',
          attributes: ['uuid', 'name', 'email'],
        },
      ],
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return webhook;
  }

  /**
   * Create a new webhook
   */
  async createWebhook(dto: CreateWebhookDto, adminId: number) {
    // Validate events
    const validEvents = Object.values(EventType) as string[];
    for (const event of dto.events) {
      if (event !== '*' && !event.endsWith('.*') && !validEvents.includes(event)) {
        throw new BadRequestException(`Invalid event type: ${event}`);
      }
    }

    const webhook = await this.webhooksRepository.create({
      uuid: uuidv4(),
      name: dto.name,
      url: dto.url,
      secret_key: this.generateSecretKey(),
      events: dto.events,
      is_active: dto.is_active ?? true,
      retry_count: dto.retry_count ?? 3,
      timeout_ms: dto.timeout_ms ?? 5000,
      description: dto.description,
      created_by: adminId,
    });

    return this.getWebhookByUuid(webhook.uuid);
  }

  /**
   * Update a webhook
   */
  async updateWebhook(uuid: string, dto: UpdateWebhookDto) {
    const webhook = await this.webhooksRepository.findOne({ where: { uuid } });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    // Validate events if provided
    if (dto.events) {
      const validEvents = Object.values(EventType) as string[];
      for (const event of dto.events) {
        if (event !== '*' && !event.endsWith('.*') && !validEvents.includes(event)) {
          throw new BadRequestException(`Invalid event type: ${event}`);
        }
      }
    }

    await this.webhooksRepository.update(dto, { where: { uuid } });

    return this.getWebhookByUuid(uuid);
  }

  /**
   * Delete a webhook (soft delete)
   */
  async deleteWebhook(uuid: string) {
    const webhook = await this.webhooksRepository.findOne({ where: { uuid } });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    await this.webhooksRepository.update(
      { deleted_at: new Date() },
      { where: { uuid } },
    );

    return { message: 'Webhook deleted successfully' };
  }

  /**
   * Regenerate webhook secret key
   */
  async regenerateSecretKey(uuid: string) {
    const webhook = await this.webhooksRepository.findOne({ where: { uuid } });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    const newSecretKey = this.generateSecretKey();

    await this.webhooksRepository.update(
      { secret_key: newSecretKey },
      { where: { uuid } },
    );

    return {
      message: 'Secret key regenerated successfully',
      secret_key: newSecretKey,
    };
  }

  /**
   * Get delivery logs for a webhook
   */
  async getDeliveryLogs(webhookUuid: string, queries: DeliveryLogQueryDto) {
    const webhook = await this.webhooksRepository.findOne({
      where: { uuid: webhookUuid },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    const page = Number(queries.page) || 1;
    const limit = Number(queries.limit) || 20;
    const offset = (page - 1) * limit;

    const where: any = { webhook_id: webhook.id };

    if (queries.status) {
      where.status = queries.status;
    }

    if (queries.event_type) {
      where.event_type = queries.event_type;
    }

    const sortOrder = queries.sort_order || 'DESC';

    const { rows, count } = await this.deliveryLogsRepository.findAndCountAll({
      where,
      order: [['created_at', sortOrder]],
      offset,
      limit,
    });

    return {
      data: rows,
      meta: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Get delivery log statistics
   */
  async getDeliveryStats(webhookUuid: string) {
    const webhook = await this.webhooksRepository.findOne({
      where: { uuid: webhookUuid },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    const [total, success, failed, pending] = await Promise.all([
      this.deliveryLogsRepository.count({ where: { webhook_id: webhook.id } }),
      this.deliveryLogsRepository.count({
        where: { webhook_id: webhook.id, status: 'success' },
      }),
      this.deliveryLogsRepository.count({
        where: { webhook_id: webhook.id, status: 'failed' },
      }),
      this.deliveryLogsRepository.count({
        where: { webhook_id: webhook.id, status: 'pending' },
      }),
    ]);

    return {
      total,
      success,
      failed,
      pending,
      success_rate: total > 0 ? ((success / total) * 100).toFixed(2) : 0,
    };
  }

  /**
   * Send a test event to webhook
   */
  async sendTestEvent(uuid: string) {
    const webhook = await this.getWebhookByUuid(uuid);

    // This will be handled by the dispatcher
    return {
      message: 'Test event queued for delivery',
      webhook_uuid: uuid,
    };
  }
}
