import { Inject, Injectable } from '@nestjs/common';
import { Seeder } from 'nestjs-seeder';
import {
  ROLES_REPOSITORY,
  PERMISSIONS_REPOSITORY,
  ROLE_HAS_PERMISSIONS_REPOSITORY,
} from 'src/config/constants';
import { Roles, Permissions, RoleHasPermissions } from 'src/models';
import { Op } from 'sequelize';

@Injectable()
export class RolePermissionsSeeder implements Seeder {
  constructor(
    @Inject(ROLES_REPOSITORY)
    private rolesRepository: typeof Roles,
    @Inject(PERMISSIONS_REPOSITORY)
    private permissionsRepository: typeof Permissions,
    @Inject(ROLE_HAS_PERMISSIONS_REPOSITORY)
    private roleHasPermissionsRepository: typeof RoleHasPermissions,
  ) {}

  seed = async (): Promise<any> => {
    // Get roles
    const developerRole = await this.rolesRepository.findOne({
      where: { name: 'Developer' },
    });

    const superAdminRole = await this.rolesRepository.findOne({
      where: { name: 'Super Admin' },
    });

    // Get all permissions
    const allPermissions = await this.permissionsRepository.findAll();

    if (allPermissions.length === 0) {
      console.log('No permissions found. Run PermissionsSeeder first.');
      return;
    }

    const rolePermissions: { role_id: number; permission_id: number }[] = [];

    // Developer gets ALL permissions
    if (developerRole) {
      allPermissions.forEach((permission) => {
        rolePermissions.push({
          role_id: developerRole.id,
          permission_id: permission.id,
        });
      });
      console.log(`Developer role: assigned ${allPermissions.length} permissions (ALL)`);
    }

    // Super Admin gets all permissions EXCEPT permissions.* (only Developer can manage permissions)
    if (superAdminRole) {
      const superAdminPermissions = allPermissions.filter(
        (p) => !p.name.startsWith('permissions.')
      );

      superAdminPermissions.forEach((permission) => {
        rolePermissions.push({
          role_id: superAdminRole.id,
          permission_id: permission.id,
        });
      });
      console.log(`Super Admin role: assigned ${superAdminPermissions.length} permissions (excluding permissions.*)`);
    }

    return this.roleHasPermissionsRepository.bulkCreate(rolePermissions, {
      ignoreDuplicates: true,
    });
  };

  drop = async (): Promise<any> => {
    return this.roleHasPermissionsRepository.destroy({ where: {} });
  };
}
