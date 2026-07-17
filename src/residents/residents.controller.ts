import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { ResidentJwtAuthGuard } from '../resident-auth/guards/resident-jwt-auth.guard';
import { CurrentResident, ResidentAuthUser } from '../resident-auth/decorators/current-resident.decorator';
import { ResidentsService } from './residents.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';
import { UpdateSelfDto } from './dto/update-self.dto';
import { SetPinDto } from './dto/set-pin.dto';

@Controller('residents')
export class ResidentsController {
  constructor(private readonly service: ResidentsService) {}

  // Resident-facing "who am I" for the app's Home screen — guarded by the
  // resident JWT strategy, not staff auth. Deliberately NOT under the staff
  // guards below.
  @UseGuards(ResidentJwtAuthGuard)
  @Get('me')
  getMe(@CurrentResident() resident: ResidentAuthUser) {
    return this.service.findSelf(resident.id);
  }

  @UseGuards(ResidentJwtAuthGuard)
  @Patch('me')
  updateMe(@CurrentResident() resident: ResidentAuthUser, @Body() dto: UpdateSelfDto) {
    return this.service.updateSelf(resident.id, dto);
  }

  @UseGuards(ResidentJwtAuthGuard)
  @Post('me/pin')
  setMyPin(@CurrentResident() resident: ResidentAuthUser, @Body() dto: SetPinDto) {
    return this.service.setPin(resident.id, dto.pin);
  }

  @UseGuards(ResidentJwtAuthGuard)
  @Get('me/messages')
  getMyMessages(@CurrentResident() resident: ResidentAuthUser) {
    return this.service.findMyMessages(resident.id);
  }

  // A resident's own activity feed — everything tied to their unit, matching
  // the Access tab in the reference product (Swipe to Open / Virtual key /
  // Mobile call / PIN, each timestamped).
  @UseGuards(ResidentJwtAuthGuard)
  @Get('me/activity')
  getMyActivity(@CurrentResident() resident: ResidentAuthUser, @Query('cursor') cursor?: string) {
    return this.service.findMyActivity(resident.id, resident.unitId, cursor);
  }

  // A resident's own accessible doors — used for the app's "My Access" list.
  @UseGuards(ResidentJwtAuthGuard)
  @Get('me/access-points')
  getMyAccessPoints(@CurrentResident() resident: ResidentAuthUser) {
    return this.service.findMyAccessPoints(resident.id);
  }

  // "Swipe to Open" quick-unlock from the app's Home/Access screen. Also
  // used mid-call to unlock with the visitor's photo attached, captured
  // client-side from the call's remote video stream.
  @UseGuards(ResidentJwtAuthGuard)
  @Post('me/open-door/:entryPointId')
  openDoor(
    @CurrentResident() resident: ResidentAuthUser,
    @Param('entryPointId') entryPointId: string,
    @Body() body: { photoUrl?: string },
  ) {
    return this.service.openDoor(resident.id, entryPointId, body?.photoUrl);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @Roles('platform_admin', 'owner_admin', 'owner_manager')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateResidentDto) {
    return this.service.create(user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateResidentDto) {
    return this.service.update(user, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/suspend')
  @Roles('platform_admin', 'owner_admin', 'owner_manager')
  suspend(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.suspend(user, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/reactivate')
  @Roles('platform_admin', 'owner_admin', 'owner_manager')
  reactivate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.reactivate(user, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/move-out')
  @Roles('platform_admin', 'owner_admin', 'owner_manager')
  moveOut(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.moveOut(user, id);
  }
}
