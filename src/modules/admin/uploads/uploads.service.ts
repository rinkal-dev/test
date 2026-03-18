import { Injectable } from '@nestjs/common';
import { StorageService, StorageResult, DeleteResult } from '../../../services/storage';

export interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    url: string;
    path: string;
    filename: string;
    originalname: string;
    mimetype: string;
    size: number;
  };
  error?: string;
}

export interface MultiUploadResponse {
  success: boolean;
  message: string;
  data?: {
    files: Array<{
      url: string;
      path: string;
      filename: string;
      originalname: string;
      mimetype: string;
      size: number;
    }>;
    failed: Array<{
      originalname: string;
      error: string;
    }>;
  };
}

@Injectable()
export class UploadsService {
  constructor(private readonly storageService: StorageService) {}

  async uploadSingle(
    file: Express.Multer.File,
    folder: string = 'general',
  ): Promise<UploadResponse> {
    const result = await this.storageService.upload(
      {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        buffer: file.buffer,
        size: file.size,
      },
      folder,
    );

    if (result.success) {
      return {
        success: true,
        message: 'File uploaded successfully',
        data: {
          url: result.url,
          path: result.path,
          filename: result.filename,
          originalname: result.originalname,
          mimetype: result.mimetype,
          size: result.size,
        },
      };
    }

    return {
      success: false,
      message: 'File upload failed',
      error: result.error,
    };
  }

  async uploadMultiple(
    files: Express.Multer.File[],
    folder: string = 'general',
  ): Promise<MultiUploadResponse> {
    const uploadedFiles: StorageResult[] = [];
    const failedFiles: Array<{ originalname: string; error: string }> = [];

    for (const file of files) {
      const result = await this.storageService.upload(
        {
          fieldname: file.fieldname,
          originalname: file.originalname,
          encoding: file.encoding,
          mimetype: file.mimetype,
          buffer: file.buffer,
          size: file.size,
        },
        folder,
      );

      if (result.success) {
        uploadedFiles.push(result);
      } else {
        failedFiles.push({
          originalname: file.originalname,
          error: result.error || 'Unknown error',
        });
      }
    }

    const allSucceeded = failedFiles.length === 0;
    const anySucceeded = uploadedFiles.length > 0;

    return {
      success: anySucceeded,
      message: allSucceeded
        ? `${uploadedFiles.length} file(s) uploaded successfully`
        : `${uploadedFiles.length} file(s) uploaded, ${failedFiles.length} failed`,
      data: {
        files: uploadedFiles.map(f => ({
          url: f.url,
          path: f.path,
          filename: f.filename,
          originalname: f.originalname,
          mimetype: f.mimetype,
          size: f.size,
        })),
        failed: failedFiles,
      },
    };
  }

  async deleteFile(filePathOrUrl: string): Promise<DeleteResult> {
    return this.storageService.delete(filePathOrUrl);
  }

  async deleteMultiple(filePaths: string[]): Promise<DeleteResult[]> {
    return this.storageService.deleteMultiple(filePaths);
  }
}
