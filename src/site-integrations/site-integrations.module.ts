import { Module } from '@nestjs/common';
import { SiteIntegrationsService } from './site-integrations.service';
import { SiteIntegrationsController } from './site-integrations.controller';

@Module({
  controllers: [SiteIntegrationsController],
  providers: [SiteIntegrationsService],
})
export class SiteIntegrationsModule {}
