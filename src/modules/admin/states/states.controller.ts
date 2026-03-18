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
import { StatesService } from './states.service';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { ChangeStatusDto } from '../sub-admins/dto/ChangeStatusDto';
import { StateQueries } from 'src/swagger/schema/StateQueries';

@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiUnprocessableEntityResponse(response.validationException)
@ApiHeaders([headers.accept, headers.accept_language])
@ApiTags(tags.COUNTRIES)
@Controller({ version: '1', path: 'states' })
export class StatesController {
  constructor(private stateService: StatesService) {}

  // ------------------------------------------------------------- Get all States -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'states',
    summary: 'Gives all states list.',
  })
  @ApiOkResponse(response.states_list)
  @Get('/')
  async getAllStates(
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Query() queries: StateQueries,
  ) {
    try {
      // Get All States
      const { count, rows: states } = await this.stateService.getAllStates(
        queries,
      );
      return res.status(HttpStatus.OK).json({
        message: `State ${i18n.t('responses.list')}`,
        data: { total_count: count, states: states },
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
    operationId: 'states-status',
    summary: 'Change status of all states in bulk.',
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
      await this.stateService.changeBulkStatus(body.status);
      return res.status(HttpStatus.OK).json({
        message: `All State's ${i18n.t('responses.status_change')}`,
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
    operationId: 'state-status',
    summary: 'Change status of particular  State.',
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
      const changeStatus = await this.stateService.changeStatus(
        uuid,
        body.status,
      );
      if (!changeStatus[0]) {
        return res.status(HttpStatus.OK).json({
          message: `State's ${i18n.t('responses.status_not_change')}`,
        });
      }
      return res.status(HttpStatus.OK).json({
        message: `State's ${i18n.t('responses.status_change')}`,
      });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }
}
