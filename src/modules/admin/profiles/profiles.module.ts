import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { adminsProviders } from '../sub-admins/sub-admins.provider';
import { personalAccessTokensProviders } from 'src/modules/auth/personal_access_tokens/personal_access_token.provider';
import { permissionsProviders } from '../permissions/permissions.provider';
import { AdminAuthService } from '../admin-auth/admin-auth.service';
import { getEnvironmentData } from 'src/helpers/general';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: getEnvironmentData('JWT_SECRET'),
      signOptions: {
        expiresIn: getEnvironmentData('JWT_ACCESS_TIME'),
      },
    }),
  ],
  controllers: [ProfilesController],
  providers: [
    ProfilesService,
    AdminAuthService,
    ...adminsProviders,
    ...personalAccessTokensProviders,
    ...permissionsProviders,
  ],
})
export class ProfilesModule {}
