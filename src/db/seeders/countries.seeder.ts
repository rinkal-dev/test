import { Inject, Injectable } from '@nestjs/common';
import { Seeder } from 'nestjs-seeder';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import {
  CITIES_REPOSITORY,
  COUNTRIES_REPOSITORY,
  STATES_REPOSITORY,
} from 'src/config/constants';
import { Cities, Countries, States } from 'src/models';

@Injectable()
export class CountriesSeeder implements Seeder {
  constructor(
    @Inject(COUNTRIES_REPOSITORY) private countriesRepository: typeof Countries,
    @Inject(STATES_REPOSITORY) private stateRepository: typeof States,
    @Inject(CITIES_REPOSITORY) private citiesRepository: typeof Cities,
  ) {}

  seed = async (): Promise<any> => {
    await this.countriesRepository.destroy({ where: {} });
    await this.stateRepository.destroy({ where: {} });
    await this.citiesRepository.destroy({ where: {} });

    // const countriesData =
    //   await require('./assets/resources_assets_countries.json');
    const data = fs.readFileSync(
      'src/db/seeders/assets/resources_assets_countries.json',
      'utf8',
    );
    const countriesData = JSON.parse(data);
    const countryData = countriesData.map((element) => ({
      uuid: uuidv4(),
      name: element.name,
      code: element.numeric_code,
      isd_code: element.phone_code,
      currency_code: element.currency,
      emoji: element.emoji,
      // Add any other necessary fields to include
    }));
    const countries = await this.countriesRepository.bulkCreate(countryData);
    let stateData = [];
    for (let i = 0; i < countriesData.length; i++) {
      stateData = countriesData[i].states.map((element) => ({
        uuid: uuidv4(),
        country_id: countries[i].id,
        name: element.name,
        code: element.state_code,
      }));
      const states = await this.stateRepository.bulkCreate(stateData);
      let citiesData = [];
      for (let j = 0; j < states.length; j++) {
        citiesData = countriesData[i].states[j].cities.map((element) => ({
          uuid: uuidv4(),
          state_id: states[j].id,
          name: element.name,
        }));
        await this.citiesRepository.bulkCreate(citiesData);
      }
    }
  };

  drop = async (): Promise<any> => {
    await this.countriesRepository.destroy({ where: {} });
    await this.stateRepository.destroy({ where: {} });
    return await this.citiesRepository.destroy({ where: {} });
  };
}
