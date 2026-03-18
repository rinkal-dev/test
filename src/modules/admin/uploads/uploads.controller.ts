import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Res,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeaders,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { I18n, I18nContext } from 'nestjs-i18n';
import { UploadsService } from './uploads.service';
import { JwtAdminAuthGuard } from 'src/auth/jwt-admin-auth.guard';
import { headers, response } from 'src/swagger/Base';
import { storageConfig } from '../../../config/storage.config';

@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@ApiHeaders([headers.accept, headers.accept_language])
@ApiInternalServerErrorResponse(response.internal_server_error)
@ApiUnauthorizedResponse(response.unauthorized)
@ApiUnprocessableEntityResponse(response.validationException)
@ApiTags('Uploads')
@Controller({ version: '1', path: 'uploads' })
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  // ------------------------------------------------------------- Upload Single File -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'upload-file',
    summary: 'Upload a single file.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
      },
      required: ['file'],
    },
  })
  @ApiQuery({
    name: 'folder',
    required: false,
    description: 'Folder to store the file (e.g., hotels, rooms, avatars)',
  })
  @ApiOkResponse(response.ok)
  @Post('/')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: storageConfig.maxFileSize,
      },
      fileFilter: (req, file, callback) => {
        if (!storageConfig.allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new Error(`Invalid file type. Allowed types: ${storageConfig.allowedMimeTypes.join(', ')}`),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadSingle(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      // Debug logging
      console.log('=== UPLOAD DEBUG ===');
      console.log('File received:', file ? 'YES' : 'NO');
      console.log('File details:', file ? {
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        hasBuffer: !!file.buffer,
        bufferLength: file.buffer?.length
      } : 'N/A');
      console.log('Folder:', folder);
      console.log('====================');

      if (!file) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'No file provided',
        });
      }

      const result = await this.uploadsService.uploadSingle(file, folder || 'general');

      if (result.success) {
        return res.status(HttpStatus.OK).json(result);
      }

      return res.status(HttpStatus.BAD_REQUEST).json(result);
    } catch (error) {
      console.error('Error uploading file:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Upload Multiple Files -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'upload-multiple-files',
    summary: 'Upload multiple files.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Files to upload (max 10)',
        },
      },
      required: ['files'],
    },
  })
  @ApiQuery({
    name: 'folder',
    required: false,
    description: 'Folder to store the files (e.g., hotels, rooms, avatars)',
  })
  @ApiOkResponse(response.ok)
  @Post('/multiple')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: {
        fileSize: storageConfig.maxFileSize,
      },
      fileFilter: (req, file, callback) => {
        if (!storageConfig.allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new Error(`Invalid file type. Allowed types: ${storageConfig.allowedMimeTypes.join(', ')}`),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      if (!files || files.length === 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'No files provided',
        });
      }

      const result = await this.uploadsService.uploadMultiple(files, folder || 'general');

      return res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
    } catch (error) {
      console.error('Error uploading files:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }

  // ------------------------------------------------------------- Delete File -----------------------------------------------------------------------
  @ApiOperation({
    operationId: 'delete-file',
    summary: 'Delete a file by URL or path.',
  })
  @ApiOkResponse(response.ok)
  @Delete('/')
  async deleteFile(
    @Body('url') url: string,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    try {
      if (!url) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'File URL is required',
        });
      }

      const result = await this.uploadsService.deleteFile(url);

      if (result.success) {
        return res.status(HttpStatus.OK).json({
          success: true,
          message: 'File deleted successfully',
        });
      }

      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Failed to delete file',
        error: result.error,
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || i18n.t('responses.internal_server_error'),
      });
    }
  }
}
