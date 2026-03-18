/**
 * Storage Service Factory
 * Provides the appropriate storage service based on configuration
 */

import { Injectable } from '@nestjs/common';
import { StorageProvider, storageConfig } from '../../config/storage.config';
import { IStorageService, UploadedFile, StorageResult, DeleteResult } from './storage.interface';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';
import { SupabaseStorageService } from './supabase-storage.service';

@Injectable()
export class StorageService implements IStorageService {
  private readonly storageProvider: IStorageService;

  constructor(
    private readonly localStorageService: LocalStorageService,
    private readonly s3StorageService: S3StorageService,
    private readonly supabaseStorageService: SupabaseStorageService,
  ) {
    // Select storage provider based on configuration
    switch (storageConfig.provider) {
      case StorageProvider.S3:
        this.storageProvider = this.s3StorageService;
        console.log('📦 Storage: Using S3 storage provider');
        break;
      case StorageProvider.SUPABASE:
        this.storageProvider = this.supabaseStorageService;
        console.log('📦 Storage: Using Supabase storage provider');
        break;
      default:
        this.storageProvider = this.localStorageService;
        console.log('📦 Storage: Using Local storage provider');
    }
  }

  /**
   * Get the current storage provider name
   */
  getProviderName(): string {
    return storageConfig.provider;
  }

  /**
   * Validate file before upload
   */
  validateFile(file: UploadedFile): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > storageConfig.maxFileSize) {
      const maxSizeMB = (storageConfig.maxFileSize / 1024 / 1024).toFixed(2);
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
      };
    }

    // Check mime type
    if (!storageConfig.allowedMimeTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `File type ${file.mimetype} is not allowed. Allowed types: ${storageConfig.allowedMimeTypes.join(', ')}`,
      };
    }

    return { valid: true };
  }

  async upload(file: UploadedFile, folder?: string): Promise<StorageResult> {
    // Validate file first
    const validation = this.validateFile(file);
    if (!validation.valid) {
      return {
        success: false,
        url: '',
        path: '',
        filename: '',
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        error: validation.error,
      };
    }

    return this.storageProvider.upload(file, folder);
  }

  async uploadMultiple(files: UploadedFile[], folder?: string): Promise<StorageResult[]> {
    // Validate all files first
    for (const file of files) {
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return files.map(f => ({
          success: false,
          url: '',
          path: '',
          filename: '',
          originalname: f.originalname,
          mimetype: f.mimetype,
          size: f.size,
          error: f === file ? validation.error : 'Upload cancelled due to invalid file in batch',
        }));
      }
    }

    return this.storageProvider.uploadMultiple(files, folder);
  }

  async delete(filePathOrUrl: string): Promise<DeleteResult> {
    return this.storageProvider.delete(filePathOrUrl);
  }

  async deleteMultiple(filePaths: string[]): Promise<DeleteResult[]> {
    return this.storageProvider.deleteMultiple(filePaths);
  }

  async exists(filePathOrUrl: string): Promise<boolean> {
    return this.storageProvider.exists(filePathOrUrl);
  }

  getUrl(filePath: string): string {
    return this.storageProvider.getUrl(filePath);
  }
}
