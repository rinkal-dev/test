/**
 * Storage Service Interface
 * All storage providers must implement this interface
 */

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface StorageResult {
  success: boolean;
  url: string;
  path: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

export interface IStorageService {
  /**
   * Upload a file and return its URL
   */
  upload(file: UploadedFile, folder?: string): Promise<StorageResult>;

  /**
   * Upload multiple files
   */
  uploadMultiple(files: UploadedFile[], folder?: string): Promise<StorageResult[]>;

  /**
   * Delete a file by its path or URL
   */
  delete(filePathOrUrl: string): Promise<DeleteResult>;

  /**
   * Delete multiple files
   */
  deleteMultiple(filePaths: string[]): Promise<DeleteResult[]>;

  /**
   * Check if a file exists
   */
  exists(filePathOrUrl: string): Promise<boolean>;

  /**
   * Get the full URL for a file path
   */
  getUrl(filePath: string): string;
}
