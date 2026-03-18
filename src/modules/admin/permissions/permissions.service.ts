import { Inject, Injectable } from '@nestjs/common';
import { CreatePermissionDto } from './dto/CreatePermissionDto';
import { Permissions } from 'src/models';
import { v4 as uuidv4 } from 'uuid';
import { offsetCount } from 'src/helpers/general';
import { PermissionQueries } from 'src/swagger/schema/PermissionQueries';
import { PERMISSIONS_REPOSITORY } from 'src/config/constants';
import { Op } from 'sequelize';

interface CreatePermission {
  uuid?: string;
  name: string;
}

@Injectable()
export class PermissionService {
  constructor(
    @Inject(PERMISSIONS_REPOSITORY)
    private permissionsRepository: typeof Permissions,
  ) {}

  // Check Permission Name
  async checkPermissionName(name: string): Promise<any> {
    return await this.permissionsRepository.count({ where: { name: name } });
  }

  async checkPermissionByUUID(uuid: string): Promise<any> {
    return await this.permissionsRepository.findOne({
      where: { uuid: uuid },
    });
  }

  // Check Permission exist or not (by UUIDs).
  async checkPermission(permissionUuids: string[]): Promise<any> {
    try {
      for (let i = 0; i < permissionUuids.length; i++) {
        const check = await this.permissionsRepository.count({
          where: { uuid: permissionUuids[i] },
        });
        if (check === 0) {
          return false;
        }
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  // Create Permission
  async createPermission(permission: CreatePermission): Promise<any> {
    return await this.permissionsRepository.create({
      uuid: uuidv4(),
      name: permission.name,
    });
  }

  // Get Search Query
  getSearchQuery(searchText: string): any {
    if (searchText) {
      return { name: { [Op.like]: `%${searchText}%` } };
    }
    return {};
  }

  // Get All Permissions
  async getAllPermissions(queries: PermissionQueries): Promise<any> {
    const pageData = offsetCount(Number(queries.page), Number(queries.limit));
    const searchQuery = this.getSearchQuery(queries.search);

    // Convert sort direction: -1/DESC -> DESC, 1/ASC -> ASC
    const sortDirection = queries.sort === '-1' || queries.sort === 'DESC' ? 'DESC' : 'ASC';

    return await this.permissionsRepository.findAndCountAll({
      where: searchQuery,
      order: [[queries.field, sortDirection]],
      offset: pageData.offset,
      limit: pageData.limit,
    });
  }

  // Get Permission Details
  async getPermissionDetails(uuid: string) {
    try {
      return await this.permissionsRepository.findOne({
        where: { uuid: uuid },
      });
    } catch (error) {
      return null;
    }
  }

  // Update Permission
  async update(uuid: string, permission: CreatePermissionDto): Promise<any> {
    try {
      return await this.permissionsRepository.update(
        { name: permission.name, updated_at: new Date() },
        { where: { uuid: uuid } },
      );
    } catch (error) {
      return [0];
    }
  }

  // Delete Permission
  async deletePermission(uuid: string): Promise<any> {
    try {
      return await this.permissionsRepository.destroy({
        where: { uuid: uuid },
      });
    } catch (error) {
      return 0;
    }
  }
}
