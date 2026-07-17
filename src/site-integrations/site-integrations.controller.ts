import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { SiteIntegrationsService } from './site-integrations.service';
import { CreateSiteIntegrationDto } from './dto/create-site-integration.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('site-integrations')
export class SiteIntegrationsController {
  constructor(private readonly service: SiteIntegrationsService) {}

  @Post()
  @Roles('platform_admin', 'owner_admin')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSiteIntegrationDto) {
    return this.service.create(user, dto);
  }

  @Get()
  findAllForSite(@CurrentUser() user: AuthUser, @Query('siteId') siteId: string) {
    return this.service.findAllForSite(user, siteId);
  }
}
