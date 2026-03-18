import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { API_KEYS_REPOSITORY } from 'src/config/constants';
import { ApiKeys, Admins } from 'src/models';
import { CreateApiKeyDto } from './dto/CreateApiKeyDto';
import { UpdateApiKeyDto } from './dto/UpdateApiKeyDto';
import { ApiKeyQueryDto } from './dto/ApiKeyQueryDto';

@Injectable()
export class ApiKeysService {
  constructor(
    @Inject(API_KEYS_REPOSITORY)
    private apiKeysRepository: typeof ApiKeys,
  ) {}

  /**
   * Generate a new API key
   * Format: dsk_<random_32_chars>
   */
  private generateApiKey(): { key: string; prefix: string; hash: string } {
    const randomPart = crypto.randomBytes(24).toString('hex');
    const key = `dsk_${randomPart}`;
    const prefix = key.substring(0, 12); // dsk_abcd1234
    const hash = crypto.createHash('sha256').update(key).digest('hex');

    return { key, prefix, hash };
  }

  /**
   * Hash an API key for comparison
   */
  hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Get all API keys with pagination
   */
  async getAllApiKeys(queries: ApiKeyQueryDto) {
    const page = Number(queries.page) || 1;
    const limit = Number(queries.limit) || 10;
    const offset = (page - 1) * limit;

    const where: any = {
      deleted_at: null, // Exclude soft-deleted keys
    };

    if (queries.is_active !== undefined) {
      where.is_active = queries.is_active;
    }

    if (queries.search) {
      where.name = { [Op.iLike]: `%${queries.search}%` };
    }

    const sortBy = queries.sort_by || 'created_at';
    const sortOrder = queries.sort_order || 'DESC';

    const { rows, count } = await this.apiKeysRepository.findAndCountAll({
      where,
      attributes: {
        exclude: ['key_hash'], // Never return the hash
      },
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
   * Get a single API key by UUID
   */
  async getApiKeyByUuid(uuid: string) {
    const apiKey = await this.apiKeysRepository.findOne({
      where: { uuid },
      attributes: {
        exclude: ['key_hash'],
      },
      include: [
        {
          model: Admins,
          as: 'created_by_admin',
          attributes: ['uuid', 'name', 'email'],
        },
      ],
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return apiKey;
  }

  /**
   * Create a new API key
   * Returns the full key only once at creation
   */
  async createApiKey(dto: CreateApiKeyDto, adminId: number) {
    const { key, prefix, hash } = this.generateApiKey();

    const apiKey = await this.apiKeysRepository.create({
      uuid: uuidv4(),
      name: dto.name,
      key_hash: hash,
      key_prefix: prefix,
      permissions: dto.permissions,
      is_active: true,
      rate_limit: dto.rate_limit,
      expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
      description: dto.description,
      created_by: adminId,
    });

    // Return the full key only this once
    const apiKeyData = await this.getApiKeyByUuid(apiKey.uuid);

    return {
      api_key: key, // This is the only time the full key is returned
      message: 'Save this API key securely. It will not be shown again.',
      data: apiKeyData,
    };
  }

  /**
   * Update an API key
   */
  async updateApiKey(uuid: string, dto: UpdateApiKeyDto) {
    const apiKey = await this.apiKeysRepository.findOne({ where: { uuid } });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    const updateData: any = { ...dto };

    if (dto.expires_at) {
      updateData.expires_at = new Date(dto.expires_at);
    }

    await this.apiKeysRepository.update(updateData, { where: { uuid } });

    return this.getApiKeyByUuid(uuid);
  }

  /**
   * Revoke (soft delete) an API key
   */
  async revokeApiKey(uuid: string) {
    const apiKey = await this.apiKeysRepository.findOne({ where: { uuid } });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.apiKeysRepository.update(
      {
        is_active: false,
        deleted_at: new Date(),
      },
      { where: { uuid } },
    );

    return { message: 'API key revoked successfully' };
  }

  /**
   * Validate an API key and return its details
   * Used by the API key guard
   */
  async validateKey(key: string): Promise<ApiKeys | null> {
    if (!key || !key.startsWith('dsk_')) {
      return null;
    }

    const hash = this.hashApiKey(key);

    const apiKey = await this.apiKeysRepository.findOne({
      where: {
        key_hash: hash,
        is_active: true,
        deleted_at: null,
        [Op.or]: [
          { expires_at: null },
          { expires_at: { [Op.gt]: new Date() } },
        ],
      },
    });

    if (apiKey) {
      // Update last used timestamp and usage count
      await this.apiKeysRepository.update(
        {
          last_used_at: new Date(),
          usage_count: apiKey.usage_count + 1,
        },
        { where: { id: apiKey.id } },
      );
    }

    return apiKey;
  }

  /**
   * Update last used IP for an API key
   */
  async updateLastUsedIp(keyId: number, ip: string): Promise<void> {
    await this.apiKeysRepository.update(
      { last_used_ip: ip },
      { where: { id: keyId } },
    );
  }

  /**
   * Check if API key has permission for a specific scope
   */
  hasPermission(apiKey: ApiKeys, requiredPermission: string): boolean {
    const permissions = apiKey.permissions as string[];

    // Check for wildcard permission
    if (permissions.includes('*')) {
      return true;
    }

    // Check for exact match
    if (permissions.includes(requiredPermission)) {
      return true;
    }

    // Check for category wildcard (e.g., 'external:*' matches 'external:bookings')
    const [category] = requiredPermission.split(':');
    if (permissions.includes(`${category}:*`)) {
      return true;
    }

    return false;
  }

  /**
   * Get available permission scopes
   */
  getAvailablePermissions() {
    return {
      categories: [
        {
          category: 'external',
          description: 'External API access for N8N and integrations',
          scopes: [
            { scope: 'external:*', description: 'Full external API access' },
            { scope: 'external:bookings', description: 'Read bookings data' },
            { scope: 'external:weddings', description: 'Read wedding data' },
            { scope: 'external:guests', description: 'Read guest data' },
            { scope: 'external:payments', description: 'Read payment data' },
            { scope: 'external:reports', description: 'Access reports' },
            { scope: 'external:actions', description: 'Trigger actions' },
          ],
        },
      ],
      wildcards: [
        { scope: '*', description: 'Full access to all APIs (use with caution)' },
      ],
    };
  }
}
