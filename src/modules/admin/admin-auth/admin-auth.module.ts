import { Module } from '@nestjs/common';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PersonalAccessTokensService } from 'src/modules/auth/personal_access_tokens/personal_access_tokens.service';
import { getEnvironmentData } from 'src/helpers/general';
import { adminsProviders } from '../sub-admins/sub-admins.provider';
import { personalAccessTokensProviders } from 'src/modules/auth/personal_access_tokens/personal_access_token.provider';
import { permissionsProviders } from '../permissions/permissions.provider';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [
    JwtModule.register({
      secret: getEnvironmentData('JWT_SECRET'),
      signOptions: {
        expiresIn: getEnvironmentData('JWT_ACCESS_TIME'),
      },
    }),
    ActivityLogsModule,
  ],
  controllers: [AdminAuthController],
  providers: [
    AdminAuthService,
    PersonalAccessTokensService,
    ...adminsProviders,
    ...personalAccessTokensProviders,
    ...permissionsProviders,
  ],
  exports: [AdminAuthService],
})
export class AdminAuthModule {}
