/**
 * Supabase Storage Service
 * Stores files using Supabase Storage
 *
 * To use:
 * 1. Install: npm install @supabase/supabase-js
 * 2. Set env: STORAGE_PROVIDER=supabase
 * 3. Set env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_STORAGE_BUCKET
 */

import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  IStorageService,
  UploadedFile,
  StorageResult,
  DeleteResult,
} from './storage.interface';
import { storageConfig } from '../../config/storage.config';

// Supabase client will be dynamically imported when needed
let supabaseClient: any = null;
let supabaseModule: any = null;

const getSupabaseClient = async () => {
  if (supabaseClient) return supabaseClient;

  try {
    // Dynamic import to avoid build errors when package is not installed
    if (!supabaseModule) {
      try {
        supabaseModule = await eval(`import('@supabase/supabase-js')`);
      } catch (importError) {
        throw new Error(
          'Supabase package not installed. Run: npm install @supabase/supabase-js'
        );
      }
    }

    const { createClient } = supabaseModule;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY/SUPABASE_ANON_KEY are required');
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);
    return supabaseClient;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    throw error;
  }
};

@Injectable()
export class SupabaseStorageService implements IStorageService {
  private readonly bucket: string;
  private readonly baseUrl: string;

  constructor() {
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';
    this.baseUrl = process.env.SUPABASE_URL
      ? `${process.env.SUPABASE_URL}/storage/v1/object/public/${this.bucket}`
      : '';
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
      const supabase = await getSupabaseClient();

      // Generate unique filename
      const filename = this.generateFilename(file.originalname);
      const filePath = folder ? `${folder}/${filename}` : filename;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucket)
        .upload(filePath, file.buffer, {
          contentType: this.getContentType(file.mimetype),
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucket)
        .getPublicUrl(filePath);

      const url = urlData?.publicUrl || `${this.baseUrl}/${filePath}`;

      return {
        success: true,
        url,
        path: filePath,
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
    const uploadPromises = files.map(file => this.upload(file, folder));
    return Promise.all(uploadPromises);
  }

  async delete(filePathOrUrl: string): Promise<DeleteResult> {
    try {
      const supabase = await getSupabaseClient();

      // Extract path from URL if needed
      let filePath = filePathOrUrl;
      if (filePathOrUrl.includes('/storage/v1/object/public/')) {
        const parts = filePathOrUrl.split('/storage/v1/object/public/');
        if (parts[1]) {
          const pathParts = parts[1].split('/');
          pathParts.shift(); // Remove bucket name
          filePath = pathParts.join('/');
        }
      }

      const { error } = await supabase.storage
        .from(this.bucket)
        .remove([filePath]);

      if (error) {
        throw error;
      }

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
      const supabase = await getSupabaseClient();

      let filePath = filePathOrUrl;
      if (filePathOrUrl.startsWith(this.baseUrl)) {
        filePath = filePathOrUrl.replace(`${this.baseUrl}/`, '');
      }

      const { data, error } = await supabase.storage
        .from(this.bucket)
        .list(path.dirname(filePath), {
          search: path.basename(filePath),
        });

      if (error) return false;
      return data && data.length > 0;
    } catch {
      return false;
    }
  }

  getUrl(filePath: string): string {
    return `${this.baseUrl}/${filePath}`;
  }
}
