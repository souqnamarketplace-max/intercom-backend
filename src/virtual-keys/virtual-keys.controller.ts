import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { ResidentJwtAuthGuard } from '../resident-auth/guards/resident-jwt-auth.guard';
import { CurrentResident, ResidentAuthUser } from '../resident-auth/decorators/current-resident.decorator';
import { VirtualKeysService } from './virtual-keys.service';
import { VirtualKeySigningService } from './virtual-key-signing.service';
import { DeliveryAuthorizationsService } from '../delivery-authorizations/delivery-authorizations.service';
import { CreateVirtualKeyDto } from './dto/create-virtual-key.dto';
import { VerifyPinDto } from './dto/verify-pin.dto';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('virtual-keys')
export class VirtualKeysController {
  constructor(private readonly service: VirtualKeysService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateVirtualKeyDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id/revoke')
  revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.revoke(user, id);
  }

  @Get()
  findAllForUnit(@CurrentUser() user: AuthUser, @Query('unitId') unitId: string) {
    return this.service.findAllForUnit(user, unitId);
  }
}

// Resident self-service: generating a Visitor Pass (QR) or Delivery Pass
// (PIN) for their own unit, without needing dashboard/staff involvement —
// this is the flow that was previously entirely missing end-to-end.
@UseGuards(ResidentJwtAuthGuard)
@Controller('residents/me/visitor-passes')
export class ResidentVisitorPassesController {
  constructor(private readonly service: VirtualKeysService) {}

  @Post()
  create(@CurrentResident() resident: ResidentAuthUser, @Body() dto: CreateVirtualKeyDto) {
    // Force these three fields from the authenticated resident's own
    // identity — never trust unitId/siteId/issuedByResidentId from the
    // client body here, unlike the staff endpoint above.
    return this.service.createInternal({
      ...dto,
      unitId: resident.unitId,
      siteId: resident.siteId,
      issuedByResidentId: resident.id,
    });
  }

  @Get()
  findMine(@CurrentResident() resident: ResidentAuthUser) {
    return this.service.findAllForUnitUnscoped(resident.unitId);
  }

  @Patch(':id/revoke')
  revokeMine(@CurrentResident() resident: ResidentAuthUser, @Param('id') id: string) {
    return this.service.revokeOwnedByUnit(resident.unitId, id);
  }
}

// Panel-facing: verifying a Delivery PIN typed on the keypad. Public/no
// staff-auth, same trust model as the other panel-api endpoints (scoped by
// site ID baked into the device at provisioning).
//
// Two separate systems both feed this one keypad: a resident-generated,
// one-time "Delivery Pass" (VirtualKey, accessMethod=pin) and a
// staff-managed, standing "carrier PIN" (DeliveryAuthorization — e.g.
// "DHL always works, 9-5"). These were built in different sessions and
// never reconciled onto one endpoint until now — checks the one-time pass
// first, then falls back to the standing carrier PIN.
@Controller('panel-api/v1/sites/:siteId/verify-visitor-pin')
export class PanelVisitorPinController {
  constructor(
    private readonly service: VirtualKeysService,
    private readonly deliveryAuthService: DeliveryAuthorizationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async verify(@Param('siteId') siteId: string, @Body() dto: VerifyPinDto) {
    const passResult = await this.service.verifyPin(siteId, dto.pin);
    if (passResult.valid) {
      await this.logUnlock(siteId, dto.entryPointId, 'delivery_pass_pin', passResult.unitId);
      return passResult;
    }

    const carrierResult = await this.deliveryAuthService.verifyPin(siteId, dto.pin);
    if (carrierResult.valid) {
      await this.logUnlock(siteId, dto.entryPointId, 'carrier_pin', undefined, carrierResult.carrierName);
      return { valid: true, carrierName: carrierResult.carrierName };
    }

    // Prefer the Delivery Pass system's reason (e.g. "already used") over a
    // generic invalid response — a carrier-PIN miss carries no useful detail.
    return passResult.reason ? passResult : { valid: false };
  }

  // Neither PIN nor QR verification wrote any audit event at all until now
  // — only calls and resident swipe-to-open did, which is why Activity
  // looked empty even after real unlocks happened at the door. Carrier
  // name goes in metadata since a carrier PIN unlock has no resident to
  // attribute — "DHL" is the only useful identity available for it.
  private async logUnlock(
    siteId: string,
    entryPointId: string | undefined,
    method: string,
    unitId?: string,
    carrierName?: string,
  ) {
    if (!entryPointId) return; // older panel builds may not send this yet
    await this.prisma.auditEvent.create({
      data: {
        siteId, entryPointId, unitId, eventType: 'unlock_pin', method, result: 'success',
        metadata: carrierName ? { carrierName } : undefined,
      },
    }).catch(() => {}); // logging failure shouldn't block the actual unlock
  }
}

// Panel-facing: what a panel needs to verify Visitor Pass QR signatures
// fully offline. BUG FIX: this revocation sync used to live under
// VirtualKeysController, which requires staff JWT — a panel has no staff
// login and could never actually reach it. Moved here, public, matching
// the trust model of the rest of panel-api (opaque site ID, not a secret).
@Controller('panel-api/v1')
export class PanelVirtualKeysController {
  constructor(
    private readonly service: VirtualKeysService,
    private readonly signing: VirtualKeySigningService,
  ) {}

  // Static across the whole system — panels can cache this indefinitely
  // once fetched, only refetching if verification ever starts failing
  // (e.g. after a key rotation).
  @Get('virtual-key-public-key')
  getPublicKey() {
    return { publicKey: this.signing.getPublicKey() };
  }

  // Panels sync this periodically (piggybacking on the heartbeat cadence)
  // to know which keys were revoked before their natural expiry — the
  // offline signature check alone can't know that.
  @Get('sites/:siteId/revoked-keys')
  getRevokedKeys(@Param('siteId') siteId: string) {
    return this.service.findRevokedForSite(siteId);
  }
}
