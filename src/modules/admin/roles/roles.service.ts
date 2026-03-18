import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PermissionService } from '../permissions/permissions.service';
import { offsetCount } from 'src/helpers/general';
import { PermissionQueries } from 'src/swagger/schema/PermissionQueries';
import {
  PERMISSIONS_REPOSITORY,
  ROLES_REPOSITORY,
  ROLE_HAS_PERMISSIONS_REPOSITORY,
  MODEL_HAS_ROLES_REPOSITORY,
} from 'src/config/constants';
import { Permissions, RoleHasPermissions, Roles, ModelHasRoles } from 'src/models';
import { Op } from 'sequelize';

// System roles that cannot be modified or deleted
const PROTECTED_ROLES = ['Developer', 'Super Admin'];

@Injectable()
export class RolesService {
  constructor(
    // @InjectModel(Roles.name) private roleModel: Model<RolesDocument>,
    @Inject(ROLES_REPOSITORY) public rolesRepository: typeof Roles,
    @Inject(PERMISSIONS_REPOSITORY)
    public permissionsRepository: typeof Permissions,
    @Inject(ROLE_HAS_PERMISSIONS_REPOSITORY)
    private roleHasPermissionsRepository: typeof RoleHasPermissions,
    @Inject(MODEL_HAS_ROLES_REPOSITORY)
    private modelHasRolesRepository: typeof ModelHasRoles,
    private permissionService: PermissionService,
  ) {}

  // Check if role is protected (system role)
  isProtectedRole(roleName: string): boolean {
    return PROTECTED_ROLES.includes(roleName);
  }

  // Check Role name Exist or not
  async checkRole(roleName: string): Promise<any> {
    return await this.rolesRepository.count({ where: { name: roleName } });
  }

  // Check Role By Id
  async checkRoleById(roleId: number): Promise<any> {
    return await this.rolesRepository.count({ where: { id: roleId } });
  }

  // Get Role By Id
  async getRoleById(roleId: number): Promise<Roles | null> {
    try {
      return await this.rolesRepository.findOne({
        where: { id: roleId },
        attributes: ['id', 'uuid', 'name'],
        raw: true,
      });
    } catch (error) {
      return null;
    }
  }

  // Create Role
  async createRole(roleName: string, createdBy?: number): Promise<any> {
    return await this.rolesRepository.create(
      { uuid: uuidv4(), name: roleName, created_by: createdBy || null },
      { raw: true },
    );
  }

  // Add Permissions (accepts UUIDs)
  async addPermissions(roleId: number, permissionUuids: string[]) {
    try {
      // Get permission IDs from UUIDs
      const permissions = await this.permissionsRepository.findAll({
        where: { uuid: permissionUuids },
        attributes: ['id'],
        raw: true,
      });

      for (const perm of permissions) {
        await this.roleHasPermissionsRepository.create({
          role_id: roleId,
          permission_id: perm.id,
        });
      }
      return true;
    } catch (error) {
      console.log('Error adding permissions:', error);
      return false;
    }
  }

  // Get All Roles (excluding protected system roles)
  // filterAdminId: null = full access (Super Admin), number = filter by created_by
  async getAllRoles(queries: PermissionQueries, filterAdminId?: number | null): Promise<any> {
    const pageData = offsetCount(Number(queries.page), Number(queries.limit));
    const searchQuery = this.permissionService.getSearchQuery(queries.search);

    // Convert sort direction: -1/DESC -> DESC, 1/ASC -> ASC
    const sortDirection = queries.sort === '-1' || queries.sort === 'DESC' ? 'DESC' : 'ASC';

    // Exclude protected system roles from listing
    const whereClause: any = {
      ...searchQuery,
      name: { [Op.notIn]: PROTECTED_ROLES },
    };

    // Data-level filtering:
    // - Super Admin (filterAdminId = null): sees ALL roles
    // - Sub-admin: sees global roles (created_by IS NULL) + their own roles
    if (filterAdminId !== null && filterAdminId !== undefined) {
      whereClause[Op.or] = [
        { created_by: null },        // Global roles (created by Super Admin)
        { created_by: filterAdminId }, // Roles created by this sub-admin
      ];
    }

    const result = await this.rolesRepository.findAndCountAll({
      where: whereClause,
      order: [[queries.field, sortDirection]],
      offset: pageData.offset,
      limit: pageData.limit,
    });

    // Add assigned admins count to each role
    const rolesWithCount = await Promise.all(
      result.rows.map(async (role) => {
        const assignedCount = await this.getAssignedAdminsCount(role.id);
        return {
          ...role.toJSON(),
          assigned_admins_count: assignedCount,
        };
      })
    );

    return {
      count: result.count,
      rows: rolesWithCount,
    };
    // return await this.rolesRepository.findAndCountAll({
    //   include: [
    //     {
    //       model: Permissions,
    //       attributes: ['uuid', 'name'],
    //       through: { attributes: [] },
    //     },
    //   ],
    // });
  }

  // Get role Details
  async getRoleDetail(uuid: string): Promise<any> {
    try {
      return await this.rolesRepository.findOne({
        where: { uuid: uuid },
        attributes: ['id', 'uuid', 'name', 'created_by'],
        include: [
          {
            model: Permissions,
            attributes: ['uuid', 'name'],
            through: { attributes: [] },
          },
        ],
      });
    } catch (error) {
      return [];
    }
  }

  // Check if admin can VIEW this role
  // - Super Admin: all roles
  // - Sub-admin: global roles + their own roles
  canViewRole(role: any, admin: any, hasFullAccess: boolean): boolean {
    if (hasFullAccess) return true;
    if (role.created_by === null) return true; // Global roles viewable by all
    if (role.created_by === admin.id) return true;
    return false;
  }

  // Check if admin can EDIT/DELETE this role
  // - Super Admin: all roles (except protected)
  // - Sub-admin: ONLY their own roles (not global roles)
  canModifyRole(role: any, admin: any, hasFullAccess: boolean): boolean {
    if (hasFullAccess) return true;
    if (role.created_by === admin.id) return true;
    return false; // Sub-admins cannot modify global roles
  }

  // Count admins assigned to a role
  async getAssignedAdminsCount(roleId: number): Promise<number> {
    return await this.modelHasRolesRepository.count({
      where: { role_id: roleId },
    });
  }

  // // Get Role Permission
  // async getRolePermission(id: string): Promise<any> {
  //   try {
  //     return await this.roleHasPermissionModel.aggregate([
  //       {
  //         $match: { role_id: new mongoose.Types.ObjectId(id) },
  //       },
  //       {
  //         $lookup: {
  //           from: 'permissions',
  //           localField: 'permission_id',
  //           foreignField: '_id',
  //           as: 'permissions',
  //         },
  //       },
  //       {
  //         $unwind: '$permissions',
  //       },
  //       {
  //         $project: {
  //           'permissions._id': 1,
  //           'permissions.name': 1,
  //           _id: 0,
  //         },
  //       },
  //     ]);
  //   } catch (error) {
  //     return [];
  //   }
  // }

  // // Check Role exist or not
  // async checkRoles(roles: string): Promise<any> {
  //   try {
  //     for (let i = 0; i < roles.length; i++) {
  //       const check = await this.roleModel.count({
  //         _id: new Types.ObjectId(roles[i]),
  //       });
  //       if (check === 0) {
  //         return false;
  //       }
  //     }
  //     return true;
  //   } catch (error) {
  //     return false;
  //   }
  // }

  // Update Role
  async update(uuid: string, name: string): Promise<any> {
    try {
      return await this.rolesRepository.update(
        { name: name, updated_at: new Date() },
        { where: { uuid: uuid } },
      );
    } catch (error) {
      return { modifiedCount: 0 };
    }
  }

  // Remove Permission
  async removePermissions(roleId: number) {
    try {
      await this.roleHasPermissionsRepository.destroy({
        where: { role_id: roleId },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Update Permission (accepts UUIDs)
  async updatePermissions(roleId: number, permissionUuids: string[]): Promise<any> {
    try {
      const removePermission = await this.removePermissions(roleId);
      if (removePermission) {
        await this.addPermissions(roleId, permissionUuids);
        return true;
      }
      return false;
    } catch (error) {
      console.log('Error updating permissions:', error);
      return false;
    }
  }

  // Delete Role
  async deleteRole(roleId: number): Promise<any> {
    try {
      const deletePermissions = await this.removePermissions(roleId);
      if (deletePermissions) {
        const deleteRole = await this.rolesRepository.destroy({
          where: { id: roleId },
        });
        return deleteRole;
      }
    } catch (error) {
      console.log(error);
      return false;
    }
  }
}
