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
import { consumers, headers, response, tags } from 'src/swagger/Base';
import { Response } from 'express';
import { I18n, I18nContext } from 'nestjs-i18n';
import { CountriesService } from './countries.service';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { ChangeStatusDto } from '../sub-admins/dto/ChangeStatusDto';
import { CountriesQueries } from 'src/swagger/schema/CountriesQueries';

@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiUnprocessableEntityResponse(response.validationException)
@ApiHeaders([headers.accept, headers.accept_language])
@ApiTags(tags.COUNTRIES)
@Controller({ version: '1', path: 'countries' })
export class CountriesController {
  constructor(private countryService: CountriesService) {}

  // ------------------------------------------------------------- Get All Countries -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'countries',
    summary: 'Give a countries List.',
  })
  @ApiOkResponse(response.countries_list)
  @Get('/')
  async getAllCountries(
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Query() queries: CountriesQueries,
  ) {
    try {
      // Get All Permissions
      const { count, rows: countries } =
        await this.countryService.getAllCountries(queries);
      return res.status(HttpStatus.OK).json({
        message: `Country ${i18n.t('responses.list')}`,
        data: { total_count: count, countries: countries },
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
    operationId: 'countries-status',
    summary: 'Change status of all countries in bulk.',
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
      await this.countryService.changeBulkStatus(body.status);
      return res.status(HttpStatus.OK).json({
        message: `All Country's ${i18n.t('responses.status_change')}`,
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
    operationId: 'country-status',
    summary: 'Change status of particular  Country.',
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
      const changeStatus = await this.countryService.changeStatus(
        uuid,
        body.status,
      );
      if (!changeStatus[0]) {
        return res.status(HttpStatus.OK).json({
          message: `Country's ${i18n.t('responses.status_not_change')}`,
        });
      }
      return res.status(HttpStatus.OK).json({
        message: `Country's ${i18n.t('responses.status_change')}`,
      });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }
}
