import { Inject, Injectable } from '@nestjs/common';
import { Seeder } from 'nestjs-seeder';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import {
  ADMINS_REPOSITORY,
  ROLES_REPOSITORY,
  MODEL_HAS_ROLES_REPOSITORY,
  ADMIN_TOKENABLE_TYPE,
} from 'src/config/constants';
import { Admins, Roles, ModelHasRoles } from 'src/models';

@Injectable()
export class AdminSeeder implements Seeder {
  constructor(
    @Inject(ADMINS_REPOSITORY)
    private adminsRepository: typeof Admins,
    @Inject(ROLES_REPOSITORY)
    private rolesRepository: typeof Roles,
    @Inject(MODEL_HAS_ROLES_REPOSITORY)
    private modelHasRolesRepository: typeof ModelHasRoles,
  ) {}

  seed = async (): Promise<any> => {
    // Create admin users
    const admins = await this.adminsRepository.bulkCreate(
      [
        {
          uuid: uuidv4(),
          name: 'Developer',
          email: 'developer@example.com',
          password: await bcrypt.hash('Admin@123', 10),
        },
        {
          uuid: uuidv4(),
          name: 'Spaceo Admin',
          email: 'spaceo.admin@gmail.com',
          password: await bcrypt.hash('Admin@123', 10),
        },
      ],
      { ignoreDuplicates: true },
    );

    // Get roles
    const developerRole = await this.rolesRepository.findOne({
      where: { name: 'Developer' },
    });

    const superAdminRole = await this.rolesRepository.findOne({
      where: { name: 'Super Admin' },
    });

    // Find admin users by email
    const developerAdmin = await this.adminsRepository.findOne({
      where: { email: 'developer@example.com' },
    });

    const spaceoAdmin = await this.adminsRepository.findOne({
      where: { email: 'spaceo.admin@gmail.com' },
    });

    const roleAssignments: { role_id: number; model_id: number; model_type: string }[] = [];

    // Assign Developer role to developer@example.com
    if (developerRole && developerAdmin) {
      roleAssignments.push({
        role_id: developerRole.id,
        model_id: developerAdmin.id,
        model_type: ADMIN_TOKENABLE_TYPE,
      });
      console.log('Assigned Developer role to developer@example.com');
    }

    // Assign Super Admin role to spaceo.admin@gmail.com
    if (superAdminRole && spaceoAdmin) {
      roleAssignments.push({
        role_id: superAdminRole.id,
        model_id: spaceoAdmin.id,
        model_type: ADMIN_TOKENABLE_TYPE,
      });
      console.log('Assigned Super Admin role to spaceo.admin@gmail.com');
    }

    if (roleAssignments.length > 0) {
      await this.modelHasRolesRepository.bulkCreate(roleAssignments, {
        ignoreDuplicates: true,
      });
    }

    return admins;
  };

  drop = async (): Promise<any> => {
    // Remove role assignments first
    const admins = await this.adminsRepository.findAll({
      where: {
        email: ['developer@example.com', 'spaceo.admin@gmail.com'],
      },
    });

    for (const admin of admins) {
      await this.modelHasRolesRepository.destroy({
        where: {
          model_id: admin.id,
          model_type: ADMIN_TOKENABLE_TYPE,
        },
      });
    }

    return this.adminsRepository.destroy({
      where: {
        email: ['developer@example.com', 'spaceo.admin@gmail.com'],
      },
    });
  };
}
