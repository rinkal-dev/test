/**
 * ============================================
 * ADMIN USERS SERVICE
 * ============================================
 * Database-agnostic service using repository pattern.
 * Switching to Supabase requires NO changes here.
 */

import { Inject, Injectable } from '@nestjs/common';
import {
  IUserRepository,
  USER_REPOSITORY,
  UserQueryParams,
} from '../../../core/repositories';
import { UserListDto } from 'src/dto/userList.dto';
import { filterQueryBuilder } from 'src/helpers/general';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY) private userRepository: IUserRepository,
  ) {}

  // Get all users
  async getUsers(queries: UserListDto) {
    const queryParams: UserQueryParams = {
      page: Number(queries.page) || 1,
      limit: Number(queries.limit) || 10,
      field: queries.field || 'created_at',
      sort: queries.sort,
    };

    if (queries?.filters) {
      // Handle filters if needed
    }
    if (queries?.search) {
      queryParams.search = queries.search;
    }

    return await this.userRepository.findAllWithFilters(queryParams);
  }

  // Get User Details
  async getUserDetails(uuid: string) {
    try {
      const user = await this.userRepository.findByUuidWithLoginDetails(uuid);
      if (user) {
        return this.formatResponse(user);
      }
      return null;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async formatResponse(userDetails: any) {
    if (userDetails.login_details) {
      for (let i = 0; i < userDetails.login_details.length; i++) {
        userDetails.login_details[i].device_type = this.decodeDeviceType(
          userDetails.login_details[i].device_type,
        );
        if (
          !userDetails.login_details[i].access_token_expired_at ||
          new Date(userDetails.login_details[i].access_token_expired_at) >= new Date() ||
          (!userDetails.login_details[i].access_token_expired_at &&
            !userDetails.login_details[i].last_used_at)
        ) {
          userDetails.login_details[i].status = 'Active';
        } else {
          userDetails.login_details[i].status = 'Inactive';
        }
      }
    }
    return userDetails;
  }

  // Change User's status
  async changeStatus(uuid: string, status: boolean) {
    try {
      await this.userRepository.changeStatus(uuid, status);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Decode Device type
  decodeDeviceType(deviceType: number) {
    if (deviceType === 1) {
      return 'IOS';
    } else if (deviceType === 2) {
      return 'Android';
    }
    return 'Web';
  }
}
