import { Inject, Injectable } from '@nestjs/common';
import { generateString } from 'src/helpers/general';
import { SOCIAL_LOGINS_REPOSITORY } from 'src/config/constants';
import { SocialLogins } from 'src/models';

@Injectable()
export class SocialLoginService {
  constructor(
    @Inject(SOCIAL_LOGINS_REPOSITORY)
    private socialLoginsRepository: typeof SocialLogins,
  ) {}

  usernameFromEmail = (email) => {
    return email.substring(0, email.indexOf('@')) + '-' + generateString(8);
  };

  updateSocialiteInfo = async (cond: any, data: any) => {
    return await this.socialLoginsRepository.findOrCreate({
      where: cond,
      defaults: data,
    });
  };

  socialTypeIdentifier = (type) => {
    let identifierToStore = null;
    if (type === 'Google') {
      identifierToStore = 1;
    } else if (type === 'Facebook') {
      identifierToStore = 2;
    } else if (type === 'Twitter') {
      identifierToStore = 3;
    } else if (type === 'Apple') {
      identifierToStore = 4;
    }

    return identifierToStore;
  };
}
