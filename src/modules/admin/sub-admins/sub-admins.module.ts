import { Module } from '@nestjs/common';
import { SubAdminService } from './sub-admins.service';
import { SubAdminController } from './sub-admins.controller';
import { PermissionService } from '../permissions/permissions.service';
import { RolesModule } from '../roles/roles.module';
import { permissionsProviders } from '../permissions/permissions.provider';
import { adminsProviders } from './sub-admins.provider';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [RolesModule, ActivityLogsModule],
  controllers: [SubAdminController],
  providers: [
    SubAdminService,
    PermissionService,
    ...permissionsProviders,
    ...adminsProviders,
  ],
})
export class SubAdminModule {}
