/**
 * S3 Storage Service
 * Stores files on AWS S3 or S3-compatible services (DigitalOcean Spaces, MinIO, etc.)
 */

import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  IStorageService,
  UploadedFile,
  StorageResult,
  DeleteResult,
} from './storage.interface';
import { storageConfig } from '../../config/storage.config';

@Injectable()
export class S3StorageService implements IStorageService {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly baseUrl: string;

  constructor() {
    const s3Config = storageConfig.s3;

    this.bucket = s3Config.bucket;
    this.baseUrl = s3Config.baseUrl || `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com`;

    // Initialize S3 client
    this.s3Client = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
      ...(s3Config.endpoint && { endpoint: s3Config.endpoint }),
    });
  }

  private generateFilename(originalname: string): string {
    const ext = path.extname(originalname);
    const uuid = uuidv4();
    const timestamp = Date.now();
    return `${timestamp}-${uuid}${ext}`;
  }

  private getContentType(mimetype: string): string {
    return mimetype || 'application/octet-stream';
  }

  async upload(file: UploadedFile, folder: string = ''): Promise<StorageResult> {
    try {
      // Generate unique filename
      const filename = this.generateFilename(file.originalname);
      const key = folder ? `${folder}/${filename}` : filename;

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: this.getContentType(file.mimetype),
        // Make file publicly readable
        ACL: 'public-read',
      });

      await this.s3Client.send(command);

      // Generate URL
      const url = `${this.baseUrl}/${key}`;

      return {
        success: true,
        url,
        path: key,
        filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      return {
        success: false,
        url: '',
        path: '',
        filename: '',
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        error: error.message,
      };
    }
  }

  async uploadMultiple(files: UploadedFile[], folder: string = ''): Promise<StorageResult[]> {
    const results: StorageResult[] = [];
    // Upload files in parallel for better performance
    const uploadPromises = files.map(file => this.upload(file, folder));
    return Promise.all(uploadPromises);
  }

  async delete(filePathOrUrl: string): Promise<DeleteResult> {
    try {
      // Extract key from URL if needed
      let key = filePathOrUrl;
      if (filePathOrUrl.startsWith(this.baseUrl)) {
        key = filePathOrUrl.replace(`${this.baseUrl}/`, '');
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteMultiple(filePaths: string[]): Promise<DeleteResult[]> {
    const deletePromises = filePaths.map(filePath => this.delete(filePath));
    return Promise.all(deletePromises);
  }

  async exists(filePathOrUrl: string): Promise<boolean> {
    try {
      let key = filePathOrUrl;
      if (filePathOrUrl.startsWith(this.baseUrl)) {
        key = filePathOrUrl.replace(`${this.baseUrl}/`, '');
      }

      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  getUrl(filePath: string): string {
    return `${this.baseUrl}/${filePath}`;
  }
}
