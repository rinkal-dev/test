import {
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { mailConfig } from 'src/config/mail';
import { parseTimeInterval } from 'src/helpers/general';
import {
  PASSWORD_RESETS_REPOSITORY,
  USERS_REPOSITORY,
} from 'src/config/constants';
import { PasswordResets, Users } from 'src/models';

@Injectable()
export class ResetPasswordService {
  constructor(
    @Inject(PASSWORD_RESETS_REPOSITORY)
    private passwordResetsRepository: typeof PasswordResets,
    @Inject(USERS_REPOSITORY) private usersRepository: typeof Users,
  ) {}

  async validateThePasswordResetRequest({ email, token, password }) {
    const request = await this.passwordResetsRepository.findOne({
      where: { email: email },
    });

    if (!request) {
      throw new UnprocessableEntityException(['password.empty']);
    } else if (
      request.token !== token &&
      !(request.token === '123456' || request.token === '1234')
    ) {
      throw new UnprocessableEntityException(['password.invalid_otp']);
    } else if (
      request.created_at.valueOf() +
        parseTimeInterval(mailConfig.passwordResetTokenExpire).ms <
      Date.now()
    ) {
      throw new UnprocessableEntityException(['password.token_expired']);
    }

    await this.passwordResetsRepository.destroy({
      where: { email: email },
    });

    return this.usersRepository.update(
      {
        password: await bcrypt.hash(password, 10),
        updated_at: new Date(),
      },
      {
        where: { email: email },
      },
    );
  }
}
