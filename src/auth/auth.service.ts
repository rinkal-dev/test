import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { getEnvironmentData } from 'src/helpers/general';
import { UsersService } from 'src/modules/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const loginType = this.guessUsername(username);
    let user;
    if (loginType === 'email') {
      user = await this.usersService.findOne({
        email: username,
      });
    } else if (loginType === 'username') {
      user = await this.usersService.findOne({
        username: username,
      });
    } else {
      user = await this.usersService.findByMobile(username);
      user = user ? user : null;
      // user = user[0] ? user[0] : null;
    }

    if (user && bcrypt.compareSync(pass, user.password)) {
      return user;
    }
    return null;
  }

  guessUsername(username) {
    let login_type = 'email';
    if (this.isUsernameIsMobile(username)) {
      login_type = 'mobile';
    } else if (!this.isUsernameIsEmail(username)) {
      login_type = 'username';
    }
    return login_type;
  }

  isUsernameIsMobile(username): boolean {
    return (
      username[0] && username[0] === '+' && Number.isFinite(Number(username))
    );
  }

  isUsernameIsEmail(username): boolean {
    return /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]{2,4}$/.test(
      username,
    );
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
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

  getCurrentPersonalTokenID(bearerToken: string): any {
    return this.decodeJwtToken(bearerToken.replace('Bearer ', ''));
  }

  decodeJwtToken(bearerToken: string): any {
    return this.jwtService.decode(bearerToken);
  }
}
