import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ADMINS_REPOSITORY } from 'src/config/constants';
import { Admins } from 'src/models';

@Injectable()
export class ProfilesService {
  constructor(
    @Inject(ADMINS_REPOSITORY) private adminsRepository: typeof Admins,
  ) {}
  // Get Admin Details
  async getAdminDetails(email: string) {
    return await this.adminsRepository.findOne({
      where: { email: email },
      attributes: ['id', 'password'],
    });
  }

  async getProfile(adminId: number) {
    return await this.adminsRepository.findOne({
      attributes: [
        'id',
        'uuid',
        'name',
        'email',
        'mobile',
        'mobile_verified_at',
        'email_verified_at',
        'profile_image',
      ],
      where: { id: adminId },
    });
  }

  // Check Current password correct or not.
  async checkPassword(passwordHash: string, password: string) {
    return await bcrypt.compare(password, passwordHash);
  }

  // Generic update method - centralized for all profile updates
  async update(adminId: number, data: Partial<{
    name: string;
    mobile: string;
    password: string;
    locale: string;
    profile_image: string;
  }>) {
    try {
      const updateData: any = { ...data, updated_at: new Date() };

      // Hash password if provided
      if (data.password) {
        updateData.password = bcrypt.hashSync(data.password, 10);
      }

      return await this.adminsRepository.update(updateData, {
        where: { id: adminId },
      });
    } catch (error) {
      return [0];
    }
  }

  // Update Password - uses centralized update method
  async updatePassword(adminId: number, password: string) {
    return this.update(adminId, { password });
  }

  // Update Profile - uses centralized update method
  async updateProfile(adminId: number, data: { name: string; mobile?: string; profile_image?: string }) {
    return this.update(adminId, { name: data.name, mobile: data.mobile, profile_image: data.profile_image });
  }
}
