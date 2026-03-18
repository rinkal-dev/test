import { Controller, Get, HttpStatus, Param, Res } from '@nestjs/common';
import {
  ApiConsumes,
  ApiHeaders,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { I18n, I18nContext } from 'nestjs-i18n';
import { ContentPageDTO } from '../../dto/content_page';
import { consumers, headers, response, tags } from '../../swagger/Base';
import { ContentPageService } from './content_page.service';

@Controller({
  path: 'content-pages',
  version: '1',
})
export class ContentPageController {
  constructor(private contentPageService: ContentPageService) {}

  @ApiTags(tags.SETTINGS)
  @ApiOperation({
    operationId: 'contentPage',
    summary: 'Get the page content.',
  })
  @ApiConsumes(consumers.formURLEncoded)
  @ApiHeaders([headers.accept, headers.accept_language])
  @ApiOkResponse({
    content: {
      'text/html': {
        example: '<html><p>String</p></html>',
      },
    },
  })
  @ApiUnauthorizedResponse(response.unauthorized)
  @ApiInternalServerErrorResponse(response.badRequest)
  @ApiUnprocessableEntityResponse(response.validationException)
  @ApiServiceUnavailableResponse(response.serverMaintenanceException)
  @Get(':slug')
  async show(
    @Param() req: ContentPageDTO,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      const data = await this.contentPageService.getPageContent(req.slug);
      return res.status(HttpStatus.OK).json(data?.content ?? null);
    } catch (error) {
      console.log(error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: i18n.t('responses.internal_server_error'),
      });
    }
  }
}
