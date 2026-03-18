import { Inject, Injectable } from '@nestjs/common';
import { Seeder } from 'nestjs-seeder';
import { USERS_REPOSITORY } from 'src/config/constants';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { Users } from 'src/models';

@Injectable()
export class UsersSeeder implements Seeder {
  constructor(
    @Inject(USERS_REPOSITORY)
    private usersRepository: typeof Users,
  ) {}

  seed = async (): Promise<any> => {
    return this.usersRepository.bulkCreate([
      {
        uuid: uuidv4(),
        name: 'Test',
        username: 'test',
        email: 'test@example.com',
        password: await bcrypt.hash('Abcd@123', 10),
      },
      {
        uuid: uuidv4(),
        name: 'Dev',
        username: 'dev',
        email: 'dev@example.com',
        password: await bcrypt.hash('Abcd@123', 10),
      },
      {
        uuid: uuidv4(),
        name: 'Kunj Baldha',
        username: 'kunjbaldha',
        email: 'kunjb.spaceo@gmail.com',
        password: await bcrypt.hash('Abcd@123', 10),
      },
    ]);
  };

  drop = async (): Promise<any> => {
    return this.usersRepository.destroy({ where: {} });
  };
}
