import {
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { mailConfig } from 'src/config/mail';
import {
  generateOTP,
  getEnvironmentData,
  parseTimeInterval,
} from 'src/helpers/general';
import { PASSWORD_RESETS_REPOSITORY } from 'src/config/constants';
import { PasswordResets } from 'src/models';

@Injectable()
export class ForgotPasswordService {
  constructor(
    @Inject(PASSWORD_RESETS_REPOSITORY)
    private passwordResetsRepository: typeof PasswordResets,
    private readonly mailerService: MailerService,
  ) {}

  async registerNewToken(email: string) {
    await this.passwordResetsRepository.destroy({
      where: { email: email },
    });

    const token = generateOTP();

    this.sendOTPToClient(email, token);
    return await this.passwordResetsRepository.create({
      email,
      token,
    });
  }

  async sendOTPToClient(email, token): Promise<void> {
    return this.mailerService
      .sendMail({
        to: email,
        subject: 'Reset Password Request',
        template: 'forgot_password',
        context: {
          token: token,
          expireTime: parseTimeInterval(mailConfig.passwordResetTokenExpire)
            .long,
          appName: getEnvironmentData('APP_NAME'),
        },
      })
      .catch((err) => {
        throw new UnprocessableEntityException([err.message]);
      });
  }
}
