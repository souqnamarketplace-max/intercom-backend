import { Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly service: DevicesService) {}

  @Post()
  @Roles('platform_admin', 'owner_admin', 'owner_manager')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDeviceDto) {
    return this.service.create(user, dto);
  }

  // Every entry point + its device(s) for a site, with computed online
  // status — the previously-missing piece blocking a real Devices screen.
  @Get()
  findAllForSite(@CurrentUser() user: AuthUser, @Query('siteId') siteId: string) {
    return this.service.findAllForSite(user, siteId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Patch(':id')
  @Roles('platform_admin', 'owner_admin', 'owner_manager')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateDeviceDto) {
    return this.service.update(user, id, dto);
  }

  // Invalidates the old setup code and issues a new one — for re-pairing a
  // reset/replaced panel, or if a code was shared somewhere it shouldn't be.
  @Patch(':id/regenerate-setup-code')
  @Roles('platform_admin', 'owner_admin', 'owner_manager')
  regenerateSetupCode(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.regenerateSetupCode(user, id);
  }

  @Delete(':id')
  @Roles('platform_admin', 'owner_admin')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
