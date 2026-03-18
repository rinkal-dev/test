import { Inject, Injectable } from '@nestjs/common';
import { Seeder } from 'nestjs-seeder';
import { v4 as uuidv4 } from 'uuid';
import { CONTENT_PAGES_REPOSITORY } from 'src/config/constants';
import { ContentPages } from 'src/models';

@Injectable()
export class ContentPagesSeeder implements Seeder {
  constructor(
    @Inject(CONTENT_PAGES_REPOSITORY)
    private contentPagesRepository: typeof ContentPages,
  ) {}

  seed = async (): Promise<any> => {
    return this.contentPagesRepository.bulkCreate([
      {
        uuid: uuidv4(),
        title: 'Privacy Policy',
        slug: 'privacy-policy',
        content: '<p>Privacy Policy Content</p>',
      },
      {
        uuid: uuidv4(),
        title: 'Terms & Conditions',
        slug: 'terms-conditions',
        content: '<p>Terms & Conditions Content</p>',
      },
      {
        uuid: uuidv4(),
        title: 'About Us',
        slug: 'about-us',
        content: '<p>About Us Content</p>',
      },
    ]);
  };

  drop = async (): Promise<any> => {
    return this.contentPagesRepository.destroy({ where: {} });
  };
}
