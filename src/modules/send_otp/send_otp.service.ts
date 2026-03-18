import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import {
  generateOTP,
  getEnvironmentData,
  parseTimeInterval,
} from 'src/helpers/general';
import { UsersService } from '../users/users.service';
// import * as ms from 'ms';
import { mailConfig } from '../../config/mail';
import { Op } from 'sequelize';

@Injectable()
export class SendOtpService {
  constructor(
    private readonly usersService: UsersService,
    private readonly mailerService: MailerService,
  ) {}

  isEmailVerification(type: string): boolean {
    return type === 'email';
  }

  async validateEmailRequest({ email }, user): Promise<void> {
    if (await this.doesOtherUsersAlreadyHaveEmail(email, user)) {
      throw new UnprocessableEntityException(['auth.email_already_exists']);
    }

    if (await this.doesUserHaveEmailAlready(email, user)) {
      throw new UnprocessableEntityException(['auth.email_already_yours']);
    }
  }

  async doesOtherUsersAlreadyHaveEmail(email, user): Promise<number> {
    return await this.usersService.isUserEmailExists(email, {
      id: {
        [Op.ne]: user.id,
      },
    });
  }

  async doesUserHaveEmailAlready(email, user): Promise<number> {
    return await this.usersService.isUserEmailExists(email, {
      id: user.id,
    });
  }

  async sendOTPToClientViaEmail({ email }, user): Promise<number | void> {
    const token = generateOTP();

    return this.mailerService
      .sendMail({
        to: email,
        subject: 'Update Email Address Request',
        template: 'update_email',
        context: {
          token: token,
          user: user,
          expireTime: parseTimeInterval(mailConfig.passwordResetTokenExpire)
            .long,
          appName: getEnvironmentData('APP_NAME'),
        },
      })
      .then(() => {
        return token;
      })
      .catch((err) => {
        throw new UnprocessableEntityException([err.message]);
      });
  }

  async validateMobileRequest({ isd_code, mobile }, user): Promise<void> {
    if (await this.doesOtherUsersAlreadyHaveMobile(isd_code, mobile, user)) {
      throw new UnprocessableEntityException(['auth.mobile_already_exists']);
    }

    if (await this.doesUserHaveMobileAlready(isd_code, mobile, user)) {
      throw new UnprocessableEntityException(['auth.mobile_already_yours']);
    }
  }

  async doesOtherUsersAlreadyHaveMobile(
    isd_code,
    mobile,
    user,
  ): Promise<number> {
    return await this.usersService.isUserMobileExists(isd_code, mobile, {
      id: {
        [Op.ne]: user.id,
      },
    });
  }

  async doesUserHaveMobileAlready(isd_code, mobile, user): Promise<number> {
    return await this.usersService.isUserMobileExists(isd_code, mobile, {
      id: user.id,
    });
  }

  async sendOTPToClientViaMobile({ isd_code, mobile }, user): Promise<number> {
    return generateOTP();
  }

  otpWillExpireAt() {
    return (
      Date.now() + parseTimeInterval(mailConfig.passwordResetTokenExpire).ms
    );
  }
}
