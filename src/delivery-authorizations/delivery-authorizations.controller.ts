import { Controller, Get, Post, Patch, Body, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { DeliveryAuthorizationsService } from './delivery-authorizations.service';
import { CreateDeliveryAuthorizationDto } from './dto/create-delivery-authorization.dto';
import { UpdateDeliveryAuthorizationDto } from './dto/update-delivery-authorization.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('delivery-authorizations')
export class DeliveryAuthorizationsController {
  constructor(private readonly service: DeliveryAuthorizationsService) {}

  @Post()
  @Roles('platform_admin', 'owner_admin', 'owner_manager')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDeliveryAuthorizationDto) {
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
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryAuthorizationDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('platform_admin', 'owner_admin')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
