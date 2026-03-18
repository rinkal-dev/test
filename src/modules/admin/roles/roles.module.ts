import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { PermissionService } from '../permissions/permissions.service';
import { permissionsProviders } from '../permissions/permissions.provider';
import { rolesProvider } from './roles.provider';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [ActivityLogsModule],
  controllers: [RolesController],
  providers: [
    RolesService,
    PermissionService,
    ...permissionsProviders,
    ...rolesProvider,
  ],
  exports: [RolesService],
})
export class RolesModule {}
