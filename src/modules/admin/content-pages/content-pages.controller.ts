import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Res,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiConsumes,
  ApiHeaders,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { I18n, I18nContext } from 'nestjs-i18n';
import { consumers, headers, response, tags } from 'src/swagger/Base';
import { ContentPagesService } from './content-pages.service';
import { CreateContentPage } from './dto/CreateContentPage';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { ChangeStatusDto } from '../sub-admins/dto/ChangeStatusDto';
import { ContentPagesQueries } from 'src/swagger/schema/ContentPagesQueries';

@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@ApiUnauthorizedResponse(response.unauthorized)
@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiUnprocessableEntityResponse(response.validationException)
@ApiHeaders([headers.accept, headers.accept_language])
@ApiTags(tags.CONTENT_PAGES)
@Controller({ version: '1', path: 'content-pages' })
export class ContentPagesController {
  constructor(private contentPagesService: ContentPagesService) {}

  // ------------------------------------------------------------- Create Content Page -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'create-content-page',
    summary: 'Create Content Page.',
  })
  @ApiConflictResponse(response.conflict)
  @ApiOkResponse(response.ok)
  @ApiConsumes(consumers.formURLEncoded)
  @Post('/store')
  async createContentPage(
    @Body() contentPage: CreateContentPage,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      // Check Slug is exist or not.
      const isExist = await this.contentPagesService.checkSlug(
        contentPage.slug,
      );
      if (isExist !== 0) {
        return res
          .status(HttpStatus.CONFLICT)
          .json({ message: `Slug ${i18n.t('responses.already_exist')}` });
      }

      // Create Content Page
      const addContentPage = await this.contentPagesService.createContentPage(
        contentPage,
      );
      if (!addContentPage) {
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ message: i18n.t('responses.error_occurred') });
      }
      return res
        .status(HttpStatus.OK)
        .json({ message: `Content Page ${i18n.t('responses.created')}` });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }

  // ------------------------------------------------------------- Get All Content Pages -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'all-content-pages',
    summary: 'Get all Content Pages.',
  })
  @ApiOkResponse(response.content_page_list)
  @Get('/')
  async getAllContentPages(
    @Res() res: Response,
    @I18n() i18n: I18nContext,
    @Query() queries: ContentPagesQueries,
  ) {
    try {
      // Get All Permissions
      const { count, rows: contentPages } =
        await this.contentPagesService.getAllContentPages(queries);
      return res.status(HttpStatus.OK).json({
        message: `Content Pages ${i18n.t('responses.list')}`,
        data: { total_count: count, content_pages: contentPages },
      });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }

  // ------------------------------------------------------------- Get Content Page Details -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'content-page-details',
    summary: 'Get Content Page details.',
  })
  @ApiOkResponse(response.content_page_details)
  @ApiParam({ name: 'uuid', type: String })
  @Get('/:uuid/show')
  async getContentPageDetails(
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      // Get Content Page Details.
      const contentPageDetails =
        await this.contentPagesService.getContentPageDetails(uuid);
      if (!contentPageDetails) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'Content Page ' + i18n.t('responses.not_found') });
      }
      return res.status(HttpStatus.OK).json({
        message: `Content Page ${i18n.t('responses.details')}`,
        data: contentPageDetails,
      });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }

  // ------------------------------------------------------------- Update Content Page -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'update-content-page',
    summary: 'Update Content Page.',
  })
  @ApiConflictResponse(response.conflict)
  @ApiNotFoundResponse(response.not_found)
  @ApiOkResponse(response.ok)
  @ApiParam({ name: 'uuid', type: String })
  @ApiConsumes(consumers.formURLEncoded)
  @Patch('/:uuid/update')
  async updateContentPage(
    @Param('uuid') uuid: string,
    @Body() contentPage: CreateContentPage,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const updateContentPage = await this.contentPagesService.update(
        uuid,
        contentPage,
      );
      if (!updateContentPage) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: `Content Page ${i18n.t('responses.not_found')}` });
      }
      return res
        .status(HttpStatus.OK)
        .json({ message: `Content Page ${i18n.t('responses.updated')}` });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }

  // --------------------------------------------------------------- Change Status ----------------------------------------------------------------------------
  @ApiOperation({
    operationId: 'content-page-status',
    summary: 'Change status of Content Page.',
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
      const changeStatus = await this.contentPagesService.changeStatus(
        uuid,
        body.status,
      );
      if (!changeStatus[0]) {
        return res.status(HttpStatus.OK).json({
          message: `Content Page ${i18n.t('responses.status_not_change')}`,
        });
      }
      return res.status(HttpStatus.OK).json({
        message: `Content Page ${i18n.t('responses.status_change')}`,
      });
    } catch (error) {
      console.log(error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: i18n.t('responses.internal_server_error') });
    }
  }
}
