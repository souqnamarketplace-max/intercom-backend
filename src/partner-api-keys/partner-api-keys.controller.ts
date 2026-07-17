import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { PartnerApiKeysService } from './partner-api-keys.service';
import { CreatePartnerApiKeyDto } from './dto/create-partner-api-key.dto';

// Only owner_admin (and platform_admin) can mint credentials that grant an
// external party access into that owner's data — this is a higher-trust
// action than day-to-day resident/device management.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('partner-api-keys')
export class PartnerApiKeysController {
  constructor(private readonly service: PartnerApiKeysService) {}

  @Post()
  @Roles('platform_admin', 'owner_admin')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePartnerApiKeyDto) {
    return this.service.create(user, dto);
  }

  @Get()
  @Roles('platform_admin', 'owner_admin')
  findAllForOwner(@CurrentUser() user: AuthUser, @Query('ownerId') ownerId: string) {
    return this.service.findAllForOwner(user, ownerId);
  }

  @Delete(':id')
  @Roles('platform_admin', 'owner_admin')
  revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.revoke(user, id);
  }
}
