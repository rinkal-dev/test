import { Inject, Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { CITIES_REPOSITORY } from 'src/config/constants';
import { offsetCount } from 'src/helpers/general';
import { Cities, Countries, States } from 'src/models';
import { CitiesQueries } from 'src/swagger/schema/CitiesQueries';

@Injectable()
export class CitiesService {
  constructor(
    @Inject(CITIES_REPOSITORY) private citiesRepository: typeof Cities,
  ) {}

  getSortArray(field: string, sort: string) {
    if (field === 'state') {
      return [{ model: States, as: 'state' }, 'name', sort];
    } else if (field === 'country') {
      return [
        { model: States, as: 'state' },
        { model: Countries, as: 'country' },
        'name',
        sort,
      ];
    }
    return ['name', sort];
  }

  // Get All Cities
  async getAllCities(queries: CitiesQueries) {
    const pageData = offsetCount(Number(queries.page), Number(queries.limit));
    const sortArray: any = this.getSortArray(queries.field, queries.sort);
    let where = {};
    if (queries.search) {
      where = {
        [Op.or]: [
          { name: { [Op.like]: `%${queries.search}%` } },
          { '$state.name$': { [Op.like]: `%${queries.search}%` } },
          { '$state.country.name$': { [Op.like]: `%${queries.search}%` } },
        ],
      };
    }

    return await this.citiesRepository.findAndCountAll({
      where: where,
      attributes: ['id', 'uuid', 'name', 'is_active'],
      include: {
        model: States,
        as: 'state',
        attributes: ['uuid', 'name'],
        include: [
          {
            model: Countries,
            as: 'country',
            attributes: ['uuid', 'name'],
          },
        ],
      },
      order: [sortArray],
      offset: pageData.offset,
      limit: pageData.limit,
    });
  }

  // Change status in bulk
  async changeBulkStatus(status: boolean) {
    return await this.citiesRepository.update(
      { is_active: status, updated_at: new Date() },
      { where: {} },
    );
  }

  // Change City's status
  async changeStatus(uuid: string, status: boolean) {
    try {
      return await this.citiesRepository.update(
        { is_active: status, updated_at: new Date() },
        { where: { uuid: uuid } },
      );
    } catch (error) {
      return [0];
    }
  }
}
