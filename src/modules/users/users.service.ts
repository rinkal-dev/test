import {
  createParamDecorator,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { USERS_REPOSITORY } from 'src/config/constants';
import { Users } from 'src/models';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY) private usersRepository: typeof Users,
  ) {}

  async isUserEmailExists(email: string, condition?: object) {
    return await this.usersRepository.count({
      where: {
        email: email,
        ...condition,
      },
    });
  }

  async isUserUsernameExists(username: string, condition?: object) {
    return await this.usersRepository.count({
      where: {
        username: username,
        ...condition,
      },
    });
  }

  async isUserMobileExists(
    isd_code: string,
    mobile: string,
    condition?: object,
  ) {
    return await this.usersRepository.count({
      where: {
        isd_code: isd_code,
        mobile: mobile,
        ...condition,
      },
    });
  }

  async create(attr: any) {
    return await this.usersRepository.create(attr);
  }

  // async findById(id: mongoose.Types.ObjectId): Promise<any> {
  //   return this.userModel.findById(id);
  // }

  async findOne(credentials: any) {
    return await this.usersRepository.findOne({ where: credentials });
  }

  async findByMobile(username: string) {
    return await this.usersRepository.findOne({ where: { mobile: username } });
  }
}

export const AuthUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
