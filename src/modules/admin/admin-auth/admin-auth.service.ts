import {
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AdminPasswordResets, Admins, PersonalAccessTokens } from 'src/models';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { mailConfig } from 'src/config/mail';
import {
  generateRandomString,
  getEnvironmentData,
  parseTimeInterval,
} from 'src/helpers/general';
import { MailerService } from '@nestjs-modules/mailer';
import {
  ADMINS_REPOSITORY,
  ADMIN_PASSWORD_RESETS_REPOSITORY,
  ADMIN_TOKENABLE_TYPE,
  PERSONAL_ACCESS_TOKENS_REPOSITORY,
  PERMISSIONS_REPOSITORY,
} from 'src/config/constants';
import { Roles, Permissions } from 'src/models';

@Injectable()
export class AdminAuthService {
  constructor(
    @Inject(ADMINS_REPOSITORY) public adminRepository: typeof Admins,
    @Inject(ADMIN_PASSWORD_RESETS_REPOSITORY)
    public adminPasswordResetsRepository: typeof AdminPasswordResets,
    @Inject(PERSONAL_ACCESS_TOKENS_REPOSITORY)
    private personalAccessTokensRepository: typeof PersonalAccessTokens,
    @Inject(PERMISSIONS_REPOSITORY)
    private permissionsRepository: typeof Permissions,
    private jwtService: JwtService,
    private mailService: MailerService,
  ) {}

  // Validate Admin - returns { admin, error } to provide specific error messages
  async validate(email: string, password: string): Promise<{ admin: any; error: string | null }> {
    const admin = await this.adminRepository.findOne({
      attributes: [
        'id',
        'uuid',
        'name',
        'password',
        'email',
        'email_verified_at',
        'mobile_verified_at',
        'is_active',
      ],
      where: {
        email: email,
      },
      raw: true,
    });

    // Account not found
    if (!admin) {
      return { admin: null, error: 'account_not_found' };
    }

    // Invalid password
    if (!bcrypt.compareSync(password, admin.password)) {
      return { admin: null, error: 'invalid_password' };
    }

    return { admin, error: null };
  }

  // Get admin's permissions via their roles
  // IMPORTANT: Super Admin and Developer roles get ALL permissions automatically
  async getAdminPermissions(adminId: number): Promise<string[]> {
    const admin = await this.adminRepository.findOne({
      where: { id: adminId },
      include: [
        {
          model: Roles,
          attributes: ['id', 'name'],
          through: {
            attributes: [],
            where: { model_type: 'Admin' },  // Filter for Admin type in polymorphic relation
          },
          include: [
            {
              model: Permissions,
              attributes: ['name'],
              through: { attributes: [] },
            },
          ],
        },
      ],
    });

    if (!admin || !admin.roles) {
      return [];
    }

    // Check if admin has Developer role (gets ALL permissions)
    const roleNames = admin.roles.map((role: any) => role.name);
    const isDeveloper = roleNames.includes('Developer');
    const isSuperAdmin = roleNames.includes('Super Admin');

    // Developer gets ALL permissions
    if (isDeveloper) {
      const allPermissions = await this.permissionsRepository.findAll({
        attributes: ['name'],
        raw: true,
      });
      return allPermissions.map((p: any) => p.name);
    }

    // Super Admin gets ALL permissions EXCEPT permissions.* (only Developer can manage permissions)
    if (isSuperAdmin) {
      const allPermissions = await this.permissionsRepository.findAll({
        attributes: ['name'],
        raw: true,
      });
      return allPermissions
        .map((p: any) => p.name)
        .filter((name: string) => !name.startsWith('permissions.'));
    }

    // Other roles get only their assigned permissions
    const permissions = new Set<string>();
    admin.roles.forEach((role: any) => {
      if (role.permissions) {
        role.permissions.forEach((perm: any) => {
          permissions.add(perm.name);
        });
      }
    });

    return Array.from(permissions);
  }

  // Check that Admin is exist or not.
  async isExist(email: string) {
    return await this.adminRepository.count({ where: { email: email } });
  }

  // Check if Admin exists and is active (for forgot password)
  async checkAdminForPasswordReset(email: string): Promise<{ exists: boolean; isActive: boolean }> {
    const admin = await this.adminRepository.findOne({
      attributes: ['id', 'is_active'],
      where: { email: email },
    });

    if (!admin) {
      return { exists: false, isActive: false };
    }

    return { exists: true, isActive: admin.is_active };
  }

  async isAdminAlreadyLoggedIn(adminId: any) {
    return (
      (await this.personalAccessTokensRepository.count({
        where: {
          tokenable_id: adminId,
          tokenable_type: ADMIN_TOKENABLE_TYPE,
        },
      })) > 0
    );
  }

  // Login
  async login(admin: any) {
    const payload = {
      sub: admin.id,
      personal_access_token_uuid: uuidv4(),
    };

    return {
      personal_access_token_uuid: payload.personal_access_token_uuid,
      access_token: this.jwtService.sign(payload, {
        secret: getEnvironmentData('JWT_SECRET'),
        expiresIn: getEnvironmentData('JWT_ACCESS_TIME'),
      }),
      refresh_token: this.jwtService.sign(payload, {
        secret: getEnvironmentData('JWT_SECRET'),
        expiresIn: getEnvironmentData('JWT_REFRESH_TIME'),
      }),
    };
  }

  // Register Forgot Password Token in Admin Password Reset Model.
  async registerNewToken(email: string) {
    await this.adminPasswordResetsRepository.destroy({
      where: { email: email },
    });

    const token = generateRandomString(mailConfig.passwordResetTokenLength);
    const url = `${getEnvironmentData('MAIL_FRONTEND_URL')}/${token}`;

    // Await the email sending
    await this.sendOTPToClient(email, url);

    return await this.adminPasswordResetsRepository.create({
      email: email,
      token: token,
    });
  }

  // Send OTP
  async sendOTPToClient(email, token): Promise<void> {
    return this.mailService
      .sendMail({
        to: email,
        subject: 'Reset Password Request',
        template: 'admin_forgot_password',
        context: {
          token: token,
          // expireTime: ms(ms(mailConfig.passwordResetTokenExpire), {
          //   long: true,
          // }),
          expireTime: parseTimeInterval(mailConfig.passwordResetTokenExpire)
            .long,
          appName: getEnvironmentData('APP_NAME'),
          logoUrl: getEnvironmentData('APP_LOGO_URL') || '',
        },
      })
      .catch((err) => {
        throw new UnprocessableEntityException([err.message]);
      });
  }

  async validateToken(token: string) {
    const passwordResetToken = await this.adminPasswordResetsRepository.findOne(
      {
        where: { token: token },
      },
    );

    if (!passwordResetToken) {
      return false;
    }
    if (
      passwordResetToken.created_at.valueOf() +
        parseTimeInterval(mailConfig.passwordResetTokenExpire).ms <
      Date.now()
    ) {
      return false;
    }
    return true;
  }

  // Reset Password Validate
  async validateThePasswordResetRequest({ token, password }) {
    const request = await this.adminPasswordResetsRepository.findOne({
      where: { token: token },
    });

    if (!request) {
      throw new UnprocessableEntityException(['password.empty']);
    } else if (request.token !== token) {
      throw new UnprocessableEntityException(['auth.invalid_link']);
    } else if (
      request.created_at.valueOf() +
        parseTimeInterval(mailConfig.passwordResetTokenExpire).ms <
      Date.now()
    ) {
      throw new UnprocessableEntityException(['password.token_expired']);
    }

    await this.adminPasswordResetsRepository.destroy({
      where: { email: request.email },
    });

    return this.adminRepository.update(
      {
        password: await bcrypt.hash(password, 10),
        updated_at: new Date(),
      },
      { where: { email: request.email } },
    );
  }

  // Get Data from AuthToken
  getCurrentPersonalTokenID(bearerToken: string): any {
    return this.decodeJwtToken(bearerToken.replace('Bearer ', ''));
  }

  // Decode AuthToken
  decodeJwtToken(bearerToken: string): any {
    return this.jwtService.decode(bearerToken);
  }

  // Logout
  async logout({ tokenableId, personalAccessTokenUUID, tokenableType }) {
    return await this.personalAccessTokensRepository.destroy({
      where: {
        uuid: personalAccessTokenUUID,
        tokenable_id: tokenableId,
        tokenable_type: tokenableType,
      },
    });
  }
}
