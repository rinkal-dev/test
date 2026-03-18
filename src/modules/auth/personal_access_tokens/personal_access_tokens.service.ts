import { Inject, Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { getEnvironmentData, parseTimeInterval } from 'src/helpers/general';
import {
  ADMIN_TOKENABLE_TYPE,
  PERSONAL_ACCESS_TOKENS_REPOSITORY,
  USER_TOKENABLE_TYPE,
} from 'src/config/constants';
import { PersonalAccessTokens } from 'src/models';

@Injectable()
export class PersonalAccessTokensService {
  constructor(
    @Inject(PERSONAL_ACCESS_TOKENS_REPOSITORY)
    public personalAccessTokensRepository: typeof PersonalAccessTokens,
  ) {}

  async isExists(condition: any) {
    return this.personalAccessTokensRepository.count({ where: condition });
  }

  async removeExistingTokenOfByUUId(personalAccessTokenUUID: string) {
    return this.personalAccessTokensRepository.destroy({
      where: {
        uuid: personalAccessTokenUUID,
      },
    });
  }

  async removeExistingTokensOfCurrentDevice({
    tokenableId,
    tokenableType,
    deviceId,
  }) {
    return this.personalAccessTokensRepository.destroy({
      where: {
        tokenable_id: tokenableId,
        tokenable_type: tokenableType,
        device_id: deviceId,
      },
    });
  }

  async removeExistingAdminTokensOfCurrentDevice({ adminId, deviceId }) {
    try {
      return this.personalAccessTokensRepository.destroy({
        where: {
          tokenable_type: ADMIN_TOKENABLE_TYPE,
          tokenable_id: adminId,
          device_id: deviceId,
        },
      });
    } catch (error) {
      return null;
    }
  }

  async registerDevice(data: object) {
    return this.personalAccessTokensRepository.create({
      ...data,
      access_token_expired_at:
        getEnvironmentData('JWT_ACCESS_TIME') !== null
          ? Date.now() +
            parseTimeInterval(getEnvironmentData('JWT_ACCESS_TIME')).ms
          : null,
      refresh_token_expired_at:
        getEnvironmentData('JWT_REFRESH_TIME') !== null
          ? Date.now() +
            parseTimeInterval(getEnvironmentData('JWT_REFRESH_TIME')).ms
          : null,
    });
  }

  async logout({ tokenableId, tokenableType, uuid }) {
    return await this.personalAccessTokensRepository.destroy({
      where: {
        tokenable_id: tokenableId,
        tokenable_type: tokenableType,
        uuid: uuid,
      },
    });
  }

  async logoutFromOtherDevices({ userId, personalAccessTokenUUID }) {
    return await this.personalAccessTokensRepository.destroy({
      where: {
        tokenable_id: userId,
        tokenable_type: USER_TOKENABLE_TYPE,
        uuid: {
          [Op.ne]: personalAccessTokenUUID,
        },
      },
    });
  }

  deviceType(type: string): number {
    let typeToStore = null;
    if (type === 'ios') {
      typeToStore = 1;
    } else if (type === 'android') {
      typeToStore = 2;
    } else if (type === 'web' || type === 'Windows' || type === 'MacOS' || type === 'Linux') {
      typeToStore = 3; // All desktop/web platforms use type 3
    }

    return typeToStore;
  }

  async isUserAlreadyLoggedIn(userId: number, tokenableType: string) {
    return (
      (await this.personalAccessTokensRepository.count({
        where: {
          tokenable_id: userId,
          tokenable_type: tokenableType,
        },
      })) > 0
    );
  }
}
