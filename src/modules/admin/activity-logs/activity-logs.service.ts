import { Inject, Injectable, Logger } from '@nestjs/common';
import { ActivityLogs } from 'src/models/ActivityLogs';
import { Admins } from 'src/models/Admins';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { ACTIVITY_LOGS_REPOSITORY } from 'src/config/constants';

export interface LogActivityInput {
  adminId?: number;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  requestPath?: string;
  requestMethod?: string;
}

export interface ActivityLogFilters {
  adminId?: number;
  action?: string;
  entityType?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  filterAdminId?: number | null; // For data-level filtering (sub-admins see only their logs)
}

@Injectable()
export class ActivityLogsService {
  private readonly logger = new Logger(ActivityLogsService.name);

  constructor(
    @Inject(ACTIVITY_LOGS_REPOSITORY)
    private readonly activityLogModel: typeof ActivityLogs,
  ) {}

  /**
   * Log an activity
   */
  async logActivity(input: LogActivityInput): Promise<ActivityLogs> {
    try {
      const log = await this.activityLogModel.create({
        uuid: uuidv4(),
        admin_id: input.adminId || null,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId || null,
        entity_name: input.entityName || null,
        description: input.description,
        metadata: input.metadata || null,
        ip_address: input.ipAddress || null,
        user_agent: input.userAgent || null,
        request_path: input.requestPath || null,
        request_method: input.requestMethod || null,
      });

      this.logger.debug(`Activity logged: ${input.action} on ${input.entityType}`);
      return log;
    } catch (error) {
      this.logger.error(`Failed to log activity: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Get activity logs with filters and pagination
   */
  async getActivityLogs(filters: ActivityLogFilters): Promise<{
    logs: ActivityLogs[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const where: any = {};

    // Data-level filtering: If filterAdminId is set, only show logs for that admin
    // This takes precedence over the query parameter adminId
    if (filters.filterAdminId !== null && filters.filterAdminId !== undefined) {
      where.admin_id = filters.filterAdminId;
    } else if (filters.adminId) {
      // Only allow filtering by adminId if user has full access (filterAdminId is null)
      where.admin_id = filters.adminId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.entityType) {
      where.entity_type = filters.entityType;
    }

    if (filters.search) {
      where.description = { [Op.iLike]: `%${filters.search}%` };
    }

    if (filters.startDate || filters.endDate) {
      where.created_at = {};
      if (filters.startDate) {
        where.created_at[Op.gte] = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.created_at[Op.lte] = new Date(filters.endDate + 'T23:59:59.999Z');
      }
    }

    const { rows: logs, count: total } = await this.activityLogModel.findAndCountAll({
      where,
      include: [
        {
          model: Admins,
          as: 'admin',
          attributes: ['id', 'uuid', 'name', 'email'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get distinct action types
   */
  async getActionTypes(): Promise<string[]> {
    const results = await this.activityLogModel.findAll({
      attributes: [[this.activityLogModel.sequelize.fn('DISTINCT', this.activityLogModel.sequelize.col('action')), 'action']],
      raw: true,
    });
    return results.map((r: any) => r.action);
  }

  /**
   * Get distinct entity types
   */
  async getEntityTypes(): Promise<string[]> {
    const results = await this.activityLogModel.findAll({
      attributes: [[this.activityLogModel.sequelize.fn('DISTINCT', this.activityLogModel.sequelize.col('entity_type')), 'entity_type']],
      raw: true,
    });
    return results.map((r: any) => r.entity_type);
  }

  /**
   * Get activity log by UUID
   */
  async getActivityLogByUuid(uuid: string): Promise<ActivityLogs | null> {
    return this.activityLogModel.findOne({
      where: { uuid },
      include: [
        {
          model: Admins,
          as: 'admin',
          attributes: ['id', 'uuid', 'name', 'email'],
        },
      ],
    });
  }

  /**
   * Get recent activities for an entity
   */
  async getEntityActivities(
    entityType: string,
    entityId: string,
    limit: number = 10,
    filterAdminId?: number | null,
  ): Promise<ActivityLogs[]> {
    const where: any = {
      entity_type: entityType,
      entity_id: entityId,
    };

    // Data-level filtering: If filterAdminId is set, only show logs for that admin
    if (filterAdminId !== null && filterAdminId !== undefined) {
      where.admin_id = filterAdminId;
    }

    return this.activityLogModel.findAll({
      where,
      include: [
        {
          model: Admins,
          as: 'admin',
          attributes: ['id', 'uuid', 'name', 'email'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
    });
  }

  /**
   * Get admin's recent activities
   */
  async getAdminActivities(adminId: number, limit: number = 10): Promise<ActivityLogs[]> {
    return this.activityLogModel.findAll({
      where: { admin_id: adminId },
      order: [['created_at', 'DESC']],
      limit,
    });
  }

  /**
   * Delete old logs (for cleanup/retention)
   */
  async deleteOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.activityLogModel.destroy({
      where: {
        created_at: { [Op.lt]: cutoffDate },
      },
    });

    this.logger.log(`Deleted ${result} activity logs older than ${daysToKeep} days`);
    return result;
  }
}
