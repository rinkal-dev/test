import { Module } from '@nestjs/common';
import { PersonalAccessTokensService } from './personal_access_tokens.service';
import { personalAccessTokensProviders } from './personal_access_token.provider';

@Module({
  imports: [],
  providers: [PersonalAccessTokensService, ...personalAccessTokensProviders],
  exports: [PersonalAccessTokensService],
})
export class PersonalAccessTokensModule {}
