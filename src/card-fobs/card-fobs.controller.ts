import { Controller, Post, Body, Param, Patch, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { CardFobsService } from './card-fobs.service';
import { CreateCardFobDto } from './dto/create-card-fob.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('card-fobs')
export class CardFobsController {
  constructor(private readonly service: CardFobsService) {}

  @Post()
  @Roles('platform_admin', 'owner_admin', 'owner_manager')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCardFobDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id/suspend')
  @Roles('platform_admin', 'owner_admin', 'owner_manager')
  suspend(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setStatus(user, id, 'suspended');
  }

  @Patch(':id/reactivate')
  @Roles('platform_admin', 'owner_admin', 'owner_manager')
  reactivate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setStatus(user, id, 'active');
  }

  @Patch(':id/revoke')
  @Roles('platform_admin', 'owner_admin', 'owner_manager')
  revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setStatus(user, id, 'revoked');
  }

  @Patch(':id/report-lost')
  @Roles('platform_admin', 'owner_admin', 'owner_manager')
  reportLost(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setStatus(user, id, 'lost_stolen');
  }

  // Device-facing sync endpoint — needs its own device-auth strategy before
  // going to real hardware (see README). Left role-open for now for testing.
  @Get('sync')
  findActiveForSite(@Query('siteId') siteId: string) {
    return this.service.findActiveForSite(siteId);
  }
}
