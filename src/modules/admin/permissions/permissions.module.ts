import { Module } from '@nestjs/common';
import { PermissionService } from './permissions.service';
import { PermissionController } from './permissions.controller';
import { permissionsProviders } from './permissions.provider';

@Module({
  imports: [],
  controllers: [PermissionController],
  providers: [PermissionService, ...permissionsProviders],
})
export class PermissionModule {}
