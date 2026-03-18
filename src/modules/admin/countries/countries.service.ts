import { Inject, Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { COUNTRIES_REPOSITORY } from 'src/config/constants';
import { offsetCount } from 'src/helpers/general';
import { Countries } from 'src/models';
import { CountriesQueries } from 'src/swagger/schema/CountriesQueries';

@Injectable()
export class CountriesService {
  constructor(
    @Inject(COUNTRIES_REPOSITORY) private countriesRepository: typeof Countries,
  ) {}

  // Get All Countries
  async getAllCountries(queries: CountriesQueries) {
    const pageData = offsetCount(Number(queries.page), Number(queries.limit));
    let where = {};
    if (queries.search) {
      where = {
        [Op.or]: [
          { name: { [Op.like]: `%${queries.search}%` } },
          { code: { [Op.like]: `%${queries.search}%` } },
          { isd_code: { [Op.like]: `%${queries.search}%` } },
          { currency_code: { [Op.like]: `%${queries.search}%` } },
        ],
      };
    }

    // Convert sort direction: -1/DESC -> DESC, 1/ASC -> ASC
    const sortDirection = queries.sort === '-1' || queries.sort === 'DESC' ? 'DESC' : 'ASC';

    return await this.countriesRepository.findAndCountAll({
      where: where,
      attributes: [
        'id',
        'uuid',
        'name',
        'code',
        'isd_code',
        'currency_code',
        'emoji',
        'is_active',
      ],
      order: [[queries.field, sortDirection]],
      offset: pageData.offset,
      limit: pageData.limit,
    });
  }

  // Change Status in bulk.
  async changeBulkStatus(status: boolean) {
    return await this.countriesRepository.update(
      { is_active: status, updated_at: new Date() },
      { where: {} },
    );
  }

  // Change Country's status
  async changeStatus(uuid: string, status: boolean) {
    try {
      return await this.countriesRepository.update(
        { is_active: status, updated_at: new Date() },
        { where: { uuid: uuid } },
      );
    } catch (error) {
      return [0];
    }
  }
}
