import { Controller, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PartnerApiKeyGuard } from './guards/partner-api-key.guard';
import { PartnerScopesGuard } from './guards/partner-scopes.guard';
import { RequireScopes } from './decorators/require-scopes.decorator';
import { CurrentPartner } from './decorators/current-partner.decorator';
import { PartnerAuthContext } from './guards/partner-api-key.guard';
import { PartnerApiService } from './partner-api.service';

// Versioned partner-facing surface — v1 is the initial contract; breaking
// changes get a v2 path rather than mutating this one under integrators.
@UseGuards(PartnerApiKeyGuard, PartnerScopesGuard)
@Controller('partner-api/v1')
export class PartnerApiController {
  constructor(private readonly service: PartnerApiService) {}

  @Get('audit-events')
  @RequireScopes('read:audit_events')
  findAuditEvents(
    @CurrentPartner() partner: PartnerAuthContext,
    @Query('siteId') siteId: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.service.findAuditEvents(partner.ownerId, siteId, cursor);
  }

  @Get('residents')
  @RequireScopes('read:residents')
  findResidents(@CurrentPartner() partner: PartnerAuthContext, @Query('siteId') siteId: string) {
    return this.service.findResidents(partner.ownerId, siteId);
  }

  @Patch('residents/:id')
  @RequireScopes('write:residents')
  updateResident(
    @CurrentPartner() partner: PartnerAuthContext,
    @Param('id') id: string,
    @Body() dto: { name?: string; email?: string; phone?: string },
  ) {
    return this.service.updateResidentContactInfo(partner.ownerId, id, dto);
  }

  @Get('devices')
  @RequireScopes('read:devices')
  findDevices(@CurrentPartner() partner: PartnerAuthContext, @Query('siteId') siteId: string) {
    return this.service.findDevices(partner.ownerId, siteId);
  }

  @Get('units')
  @RequireScopes('read:units')
  findUnits(@CurrentPartner() partner: PartnerAuthContext, @Query('siteId') siteId: string) {
    return this.service.findUnits(partner.ownerId, siteId);
  }
}
