import { Module } from '@nestjs/common';
import { PartnerApiService } from './partner-api.service';
import { PartnerApiController } from './partner-api.controller';
import { PartnerApiKeyGuard } from './guards/partner-api-key.guard';
import { PartnerScopesGuard } from './guards/partner-scopes.guard';

@Module({
  controllers: [PartnerApiController],
  providers: [PartnerApiService, PartnerApiKeyGuard, PartnerScopesGuard],
})
export class PartnerApiModule {}
