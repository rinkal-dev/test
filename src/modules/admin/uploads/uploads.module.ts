import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import {
  StorageService,
  LocalStorageService,
  S3StorageService,
  SupabaseStorageService,
} from '../../../services/storage';

@Module({
  controllers: [UploadsController],
  providers: [
    UploadsService,
    StorageService,
    LocalStorageService,
    S3StorageService,
    SupabaseStorageService,
  ],
  exports: [UploadsService, StorageService],
})
export class UploadsModule {}
