import { Inject, Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { CreateSubAdminDto } from './dto/CreateSubAdminDto';
import { RolesService } from '../roles/roles.service';
import { offsetCount, getEnvironmentData, generateRandomPassword } from 'src/helpers/general';
import { SubAdminQueries } from 'src/swagger/schema/SubAdminQueries';
import {
  ADMINS_REPOSITORY,
  ADMIN_TOKENABLE_TYPE,
  MODEL_HAS_ROLES_REPOSITORY,
} from 'src/config/constants';
import { Admins, ModelHasRoles, Roles } from 'src/models';
import { Op } from 'sequelize';

@Injectable()
export class SubAdminService {
  private readonly logger = new Logger(SubAdminService.name);

  constructor(
    @Inject(ADMINS_REPOSITORY) public adminsRepository: typeof Admins,
    @Inject(MODEL_HAS_ROLES_REPOSITORY)
    public modelHasRolesRepository: typeof ModelHasRoles,
    public rolesService: RolesService,
    private readonly mailService: MailerService,
  ) {}

  // Check Email exist or not.
  async checkEmail(email: string) {
    return await this.adminsRepository.count({ where: { email: email } });
  }

  // Check Role
  async checkRole(roles: any): Promise<any> {
    try {
      for (let i = 0; i < roles.length; i++) {
        if ((await this.rolesService.checkRoleById(roles[i])) === 0) {
          return false;
        }
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  // Create Sub Admin
  async createSubAdmin(subAdmin: CreateSubAdminDto, createdByAdminId?: number) {
    const plainPassword = generateRandomPassword();
    const hashedPassword = bcrypt.hashSync(plainPassword, 10);

    const admin = await this.adminsRepository.create({
      uuid: uuidv4(),
      name: subAdmin.name,
      email: subAdmin.email,
      password: hashedPassword,
      is_active: subAdmin.is_active,
      created_by: createdByAdminId || null,
    });

    // Return both admin and plain password for email
    return { admin, plainPassword };
  }

  // Get All Sub Admin
  // filterAdminId: null = full access (no filter), number = only show sub-admins created by this admin
  async getAllSubAdmins(queries: SubAdminQueries, filterAdminId?: number | null) {
    const pageData = offsetCount(Number(queries.page), Number(queries.limit));
    const where: any = {};
    const andConditions: any[] = [];

    // Data-level filtering: Only show sub-admins created by the current admin
    // Super Admin/Developer (filterAdminId = null) see all
    if (filterAdminId !== null && filterAdminId !== undefined) {
      andConditions.push({ created_by: filterAdminId });
    }

    // Search filter
    if (queries.search) {
      andConditions.push({
        [Op.or]: [
          { name: { [Op.iLike]: `%${queries.search}%` } },
          { email: { [Op.iLike]: `%${queries.search}%` } },
        ],
      });
    }

    // Apply AND conditions if any exist
    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
    }

    // Convert sort direction: -1/DESC -> DESC, 1/ASC -> ASC
    const sortDirection = queries.sort === '-1' || queries.sort === 'DESC' ? 'DESC' : 'ASC';

    return await this.adminsRepository.findAndCountAll({
      where: where,
      attributes: [
        'id',
        'uuid',
        'name',
        'email',
        'is_active',
        'created_by',
        'created_at',
        'updated_at',
      ],
      include: [
        {
          model: Roles,
          attributes: ['uuid', 'name'],
          through: { attributes: [] },
        },
      ],
      order: [[queries.field, sortDirection]],
      offset: pageData.offset,
      limit: pageData.limit,
    });
  }

  async isExist(uuid: string) {
    try {
      return await this.adminsRepository.findOne({
        attributes: ['id', 'email', 'created_by'],
        where: { uuid: uuid },
        raw: true,
      });
    } catch (error) {
      return null;
    }
  }

  // Get Sub Admin Details
  async getSubAdminDetails(uuid: string) {
    try {
      return await this.adminsRepository.findOne({
        where: { uuid: uuid },
        attributes: [
          'id',
          'uuid',
          'name',
          'email',
          'locale',
          'is_active',
          'created_by',
          'created_at',
        ],
        include: [
          {
            model: Roles,
            attributes: ['uuid', 'name'],
            through: { attributes: [] },
          },
        ],
      });
    } catch (error) {
      return null;
    }
  }

  // Update Sub Admin
  async update(uuid: string, subAdmin: any) {
    try {
      subAdmin.updated_at = new Date();
      return await this.adminsRepository.update(subAdmin, {
        where: { uuid: uuid },
      });
    } catch (error) {
      return false;
    }
  }

  // Add Role
  async addRole(adminId: number, roles: any, modelType: string) {
    try {
      for (let i = 0; i < roles.length; i++) {
        await this.modelHasRolesRepository.create({
          role_id: roles[i],
          model_id: adminId,
          model_type: modelType,
        });
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  // Remove Role
  async removeRoles(subAdminId: number) {
    try {
      await this.modelHasRolesRepository.destroy({
        where: {
          model_id: subAdminId,
          model_type: ADMIN_TOKENABLE_TYPE,
        },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Update Roles
  async updateRoles(subAdminId: number, roles: any): Promise<any> {
    try {
      const removeRoles = await this.removeRoles(subAdminId);
      if (!removeRoles) {
        return false;
      }
      await this.addRole(subAdminId, roles, ADMIN_TOKENABLE_TYPE);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Delete Role Entry
  async deleteRoleEntry(subAdminId: number, modelType: string) {
    return await this.modelHasRolesRepository.destroy({
      where: { model_id: subAdminId, model_type: modelType },
    });
  }

  // Delete Sub Admins
  async deleteSubAdmin(subAdminId: number) {
    try {
      await this.deleteRoleEntry(subAdminId, ADMIN_TOKENABLE_TYPE);
      return await this.adminsRepository.destroy({ where: { id: subAdminId } });
    } catch (error) {
      return 0;
    }
  }

  // Change User's status
  async changeStatus(uuid: string, status: boolean) {
    try {
      return await this.adminsRepository.update(
        { is_active: status, updated_at: new Date() },
        { where: { uuid: uuid } },
      );
    } catch (error) {
      return [0];
    }
  }

  // Get admin login URL
  private getAdminLoginUrl(): string {
    const frontendUrl = getEnvironmentData('FRONTEND_URL') || 'http://localhost:3001';
    return `${frontendUrl}/admin/login`;
  }

  // Send email notification when sub-admin is created
  async sendSubAdminCreatedEmail(
    email: string,
    name: string,
    password: string,
    roleName?: string,
  ): Promise<boolean> {
    try {
      await this.mailService.sendMail({
        to: email,
        subject: 'Welcome to DESTAPAY Admin Portal - Your Account Has Been Created',
        template: 'sub_admin_created',
        context: {
          name: name,
          email: email,
          password: password,
          role: roleName || null,
          loginUrl: this.getAdminLoginUrl(),
          appName: getEnvironmentData('APP_NAME') || 'DESTAPAY',
          logoUrl: getEnvironmentData('APP_LOGO_URL') || '',
        },
      });
      this.logger.log(`Sub-admin created email sent to: ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send sub-admin created email to ${email}:`, error);
      return false;
    }
  }

  // Send email notification when sub-admin is updated
  async sendSubAdminUpdatedEmail(
    email: string,
    name: string,
    isActive: boolean,
    roleName?: string,
  ): Promise<boolean> {
    try {
      await this.mailService.sendMail({
        to: email,
        subject: 'DESTAPAY Admin Portal - Your Account Has Been Updated',
        template: 'sub_admin_updated',
        context: {
          name: name,
          email: email,
          isActive: isActive,
          role: roleName || null,
          loginUrl: this.getAdminLoginUrl(),
          appName: getEnvironmentData('APP_NAME') || 'DESTAPAY',
          logoUrl: getEnvironmentData('APP_LOGO_URL') || '',
        },
      });
      this.logger.log(`Sub-admin updated email sent to: ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send sub-admin updated email to ${email}:`, error);
      return false;
    }
  }

  // Get role name by ID
  async getRoleNameById(roleId: number): Promise<string | null> {
    try {
      const role = await this.rolesService.getRoleById(roleId);
      return role?.name || null;
    } catch (error) {
      return null;
    }
  }
}
