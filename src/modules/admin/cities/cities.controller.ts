import {
  Controller,
  Get,
  UseGuards,
  Res,
  HttpStatus,
  Query,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiHeaders,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { I18n, I18nContext } from 'nestjs-i18n';
import { consumers, headers, response, tags } from 'src/swagger/Base';
import { CitiesService } from './cities.service';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { CitiesQueries } from 'src/swagger/schema/CitiesQueries';
import { ChangeStatusDto } from '../sub-admins/dto/ChangeStatusDto';

@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@ApiHeaders([headers.accept, headers.accept_language])
@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiUnprocessableEntityResponse(response.validationException)
@ApiTags(tags.COUNTRIES)
@Controller({ version: '1', path: 'cities' })
export class CitiesController {
  constructor(private citiesService: CitiesService) {}

  // ------------------------------------------------------------- Get All cities -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'cities',
    summary: 'Gives all cities list.',
  })
  @ApiOkResponse(response.cities_list)
  @ApiTags(tags.COUNTRIES)
  @Get('/')
  async getAllStates(
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Query() queries: CitiesQueries,
  ) {
    try {
      // Get All States
      const { count, rows: cities } = await this.citiesService.getAllCities(
        queries,
      );
      return res.status(HttpStatus.OK).json({
        message: `Cities ${i18n.t('responses.list')}`,
        data: { total_count: count, cities: cities },
      });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }

  // ------------------------------------------------------------- Status change - Bulk -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'cities-status',
    summary: 'Change status of all cities in bulk.',
  })
  @ApiConsumes(consumers.formURLEncoded)
  @ApiOkResponse(response.ok)
  @Patch('/activate')
  async changeBulkStatus(
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Body() body: ChangeStatusDto,
  ) {
    try {
      await this.citiesService.changeBulkStatus(body.status);
      return res.status(HttpStatus.OK).json({
        message: `All City's ${i18n.t('responses.status_change')}`,
      });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }

  // --------------------------------------------------------------- Change Status ----------------------------------------------------------------------------
  @ApiOperation({
    operationId: 'city-status',
    summary: 'Change status of particular  City.',
  })
  @ApiConsumes(consumers.formURLEncoded)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', type: String })
  @Patch('/:uuid/activate')
  async changeStatus(
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Body() body: ChangeStatusDto,
    @Param('uuid') uuid: string,
  ) {
    try {
      const changeStatus = await this.citiesService.changeStatus(
        uuid,
        body.status,
      );
      if (!changeStatus[0]) {
        return res.status(HttpStatus.OK).json({
          message: `City's ${i18n.t('responses.status_not_change')}`,
        });
      }
      return res.status(HttpStatus.OK).json({
        message: `City's ${i18n.t('responses.status_change')}`,
      });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }
}
