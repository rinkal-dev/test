import { Inject, Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { STATES_REPOSITORY } from 'src/config/constants';
import { offsetCount } from 'src/helpers/general';
import { Countries, States } from 'src/models';
import { StateQueries } from 'src/swagger/schema/StateQueries';
export interface query {
  $or?: any;
}

@Injectable()
export class StatesService {
  constructor(
    @Inject(STATES_REPOSITORY) private statesRepository: typeof States,
  ) {}

  // Get all states
  async getAllStates(queries: StateQueries) {
    const pageData = offsetCount(Number(queries.page), Number(queries.limit));
    let where = {};
    if (queries.search) {
      where = {
        [Op.or]: [
          { name: { [Op.like]: `%${queries.search}%` } },
          { code: { [Op.like]: `%${queries.search}%` } },
          { '$country.name$': { [Op.like]: `%${queries.search}%` } },
        ],
      };
    }

    // Convert sort direction: -1/DESC -> DESC, 1/ASC -> ASC
    const sortDirection = queries.sort === '-1' || queries.sort === 'DESC' ? 'DESC' : 'ASC';

    return await this.statesRepository.findAndCountAll({
      where: where,
      attributes: ['id', 'uuid', 'name', 'code', 'is_active'],
      include: {
        model: Countries,
        attributes: ['uuid', 'name'],
      },
      order: [[queries.field, sortDirection]],
      offset: pageData.offset,
      limit: pageData.limit,
    });
  }

  // Change status in bulk.
  async changeBulkStatus(status: boolean) {
    return await this.statesRepository.update(
      { is_active: status, updated_at: new Date() },
      { where: {} },
    );
  }

  // Change State's status
  async changeStatus(uuid: string, status: boolean) {
    try {
      return await this.statesRepository.update(
        { is_active: status, updated_at: new Date() },
        { where: { uuid: uuid } },
      );
    } catch (error) {
      return [0];
    }
  }
}
