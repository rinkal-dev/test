/**
 * Local Storage Service
 * Stores files on the local filesystem
 */

import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
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
export class LocalStorageService implements IStorageService {
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor() {
    this.uploadDir = storageConfig.local.uploadDir;
    this.baseUrl = storageConfig.local.baseUrl;

    // Ensure upload directory exists
    this.ensureDirectoryExists(this.uploadDir);
  }

  private ensureDirectoryExists(dir: string): void {
    const fullPath = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  private generateFilename(originalname: string): string {
    const ext = path.extname(originalname);
    const uuid = uuidv4();
    const timestamp = Date.now();
    return `${timestamp}-${uuid}${ext}`;
  }

  async upload(file: UploadedFile, folder: string = ''): Promise<StorageResult> {
    try {
      // Create folder path
      const folderPath = folder ? path.join(this.uploadDir, folder) : this.uploadDir;
      this.ensureDirectoryExists(folderPath);

      // Generate unique filename
      const filename = this.generateFilename(file.originalname);
      const filePath = path.join(folderPath, filename);
      const fullPath = path.resolve(process.cwd(), filePath);

      // Debug logging
      console.log('=== STORAGE DEBUG ===');
      console.log('Upload dir:', this.uploadDir);
      console.log('Folder path:', folderPath);
      console.log('Filename:', filename);
      console.log('Full path:', fullPath);
      console.log('Buffer size:', file.buffer?.length);
      console.log('CWD:', process.cwd());
      console.log('=====================');

      // Write file to disk
      fs.writeFileSync(fullPath, file.buffer);
      console.log('File written successfully to:', fullPath);

      // Verify file exists after write
      const exists = fs.existsSync(fullPath);
      console.log('File exists after write:', exists);
      if (exists) {
        const stats = fs.statSync(fullPath);
        console.log('File size on disk:', stats.size);
      }

      // Generate relative URL (portable across environments)
      const relativePath = folder ? `${folder}/${filename}` : filename;
      const url = `/uploads/${relativePath}`;

      return {
        success: true,
        url,
        path: relativePath,
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
    for (const file of files) {
      const result = await this.upload(file, folder);
      results.push(result);
    }
    return results;
  }

  async delete(filePathOrUrl: string): Promise<DeleteResult> {
    console.log('=== DELETE DEBUG ===');
    console.log('Delete called with:', filePathOrUrl);
    console.log('====================');
    try {
      // Extract path from URL if needed
      let filePath = filePathOrUrl;

      // Handle /uploads/ prefix (relative URL format)
      if (filePathOrUrl.startsWith('/uploads/')) {
        filePath = filePathOrUrl.replace('/uploads/', '');
      }
      // Handle full URL format
      else if (filePathOrUrl.startsWith(this.baseUrl)) {
        filePath = filePathOrUrl.replace(`${this.baseUrl}/`, '');
      }

      const fullPath = path.resolve(process.cwd(), this.uploadDir, filePath);

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return { success: true };
      }

      return { success: false, error: 'File not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteMultiple(filePaths: string[]): Promise<DeleteResult[]> {
    const results: DeleteResult[] = [];
    for (const filePath of filePaths) {
      const result = await this.delete(filePath);
      results.push(result);
    }
    return results;
  }

  async exists(filePathOrUrl: string): Promise<boolean> {
    try {
      let filePath = filePathOrUrl;
      if (filePathOrUrl.startsWith(this.baseUrl)) {
        filePath = filePathOrUrl.replace(`${this.baseUrl}/`, '');
      }

      const fullPath = path.resolve(process.cwd(), this.uploadDir, filePath);
      return fs.existsSync(fullPath);
    } catch {
      return false;
    }
  }

  getUrl(filePath: string): string {
    return `${this.baseUrl}/${filePath}`;
  }
}
