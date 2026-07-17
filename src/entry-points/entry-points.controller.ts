import { Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { EntryPointsService } from './entry-points.service';
import { CreateEntryPointDto } from './dto/create-entry-point.dto';
import { UpdateEntryPointDto } from './dto/update-entry-point.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('entry-points')
export class EntryPointsController {
  constructor(private readonly service: EntryPointsService) {}

  @Post()
  @Roles('platform_admin', 'owner_admin', 'owner_manager')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEntryPointDto) {
    return this.service.create(user, dto);
  }

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
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateEntryPointDto) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('platform_admin', 'owner_admin')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
