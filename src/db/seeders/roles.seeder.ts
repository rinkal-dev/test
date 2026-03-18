import { Inject, Injectable } from '@nestjs/common';
import { Seeder } from 'nestjs-seeder';
import { v4 as uuidv4 } from 'uuid';
import { ROLES_REPOSITORY } from 'src/config/constants';
import { Roles } from 'src/models';

@Injectable()
export class RolesSeeder implements Seeder {
  constructor(
    @Inject(ROLES_REPOSITORY)
    private rolesRepository: typeof Roles,
  ) {}

  seed = async (): Promise<any> => {
    const now = new Date();
    const roles = [
      {
        uuid: uuidv4(),
        name: 'Developer',
        created_at: now,
      },
      {
        uuid: uuidv4(),
        name: 'Super Admin',
        created_at: now,
      },
    ];

    return this.rolesRepository.bulkCreate(roles, {
      ignoreDuplicates: true,
    });
  };

  drop = async (): Promise<any> => {
    return this.rolesRepository.destroy({ where: {} });
  };
}
