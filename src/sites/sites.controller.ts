import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { SitesService } from './sites.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  @Roles('platform_admin', 'owner_admin')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSiteDto) {
    return this.sitesService.create(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.sitesService.findAll(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sitesService.findOne(user, id);
  }

  @Patch(':id')
  @Roles('platform_admin', 'owner_admin', 'owner_manager')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateSiteDto) {
    return this.sitesService.update(user, id, dto);
  }

  @Patch(':id/regenerate-setup-code')
  @Roles('platform_admin', 'owner_admin', 'owner_manager')
  regenerateSetupCode(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sitesService.regenerateSetupCode(user, id);
  }

  @Delete(':id')
  @Roles('platform_admin', 'owner_admin')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sitesService.remove(user, id);
  }
}
