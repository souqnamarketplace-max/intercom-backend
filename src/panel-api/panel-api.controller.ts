import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { PanelApiService } from './panel-api.service';
import { DevicesService } from '../devices/devices.service';
import { VerifyPanelPinDto } from './dto/verify-panel-pin.dto';
import { ChangeSettingsPinDto } from './dto/change-settings-pin.dto';
import { SendPanelMessageDto } from './dto/send-panel-message.dto';
import { ProvisionDto } from './dto/provision.dto';
import { ResolveSiteCodeDto } from './dto/resolve-site-code.dto';
import { ClaimEntryPointDto } from './dto/claim-entry-point.dto';
import { LogCallEventDto } from './dto/log-call-event.dto';
import { LogUnlockEventDto } from './dto/log-unlock-event.dto';
import { VerifyDoorPinDto } from './dto/verify-door-pin.dto';
import { AuditEventsService } from '../audit-events/audit-events.service';
import { ResidentsService } from '../residents/residents.service';

// Versioned surface the physical intercom panel calls directly — no staff JWT,
// since the panel isn't a staff member. Every route is scoped by IDs the
// panel only learns via pairing — same trust model as the static site QR
// code (opaque ID, not a secret, always resolved server-side).
@Controller('panel-api/v1')
export class PanelApiController {
  constructor(
    private readonly service: PanelApiService,
    private readonly devices: DevicesService,
    private readonly auditEvents: AuditEventsService,
    private readonly residents: ResidentsService,
  ) {}

  // Primary pairing flow, step 1: validate the site's reusable code and
  // list its existing entry points so the installer can pick the right
  // door. Replaces needing to pre-create a Device row + one-time code in
  // the dashboard before every install.
  @Post('resolve-site-code')
  resolveSiteCode(@Body() dto: ResolveSiteCodeDto) {
    return this.devices.resolveSiteCode(dto.code);
  }

  // Pairing flow, step 2: claim a specific entry point. Idempotent — safe
  // to call again for the same physical device (e.g. Setup screen reopened).
  @Post('claim-entry-point')
  claimEntryPoint(@Body() dto: ClaimEntryPointDto) {
    return this.devices.claimEntryPoint(dto.siteId, dto.entryPointId, dto.deviceType);
  }

  // Secondary pairing flow: exchanges a one-time per-device setup code
  // (generated from the dashboard's Devices screen) for that exact device's
  // identity. Useful for re-pairing a specific existing device without
  // going through the site-code + door-picker flow.
  @Post('provision')
  provision(@Body() dto: ProvisionDto) {
    return this.devices.provision(dto.setupCode);
  }

  // Panels call this every ~20-30s once provisioned. Dashboard's Devices
  // screen derives online/offline from how recently this landed, rather
  // than trusting a status field a now-offline device can't update itself.
  @Post('devices/:deviceId/heartbeat')
  heartbeat(@Param('deviceId') deviceId: string) {
    return this.devices.heartbeat(deviceId);
  }

  @Get('sites/:siteId')
  getSiteInfo(@Param('siteId') siteId: string) {
    return this.service.getSiteInfo(siteId);
  }

  @Get('sites/:siteId/directory')
  getDirectory(@Param('siteId') siteId: string) {
    return this.service.getDirectory(siteId);
  }

  @Post('sites/:siteId/verify-settings-pin')
  verifySettingsPin(@Param('siteId') siteId: string, @Body() dto: VerifyPanelPinDto) {
    return this.service.verifySettingsPin(siteId, dto.pin);
  }

  // Self-service PIN change from the panel itself — previously the only
  // way to change this was via the dashboard's Branding & Panel Settings
  // screen, with no panel-side flow at all.
  @Post('sites/:siteId/change-settings-pin')
  changeSettingsPin(@Param('siteId') siteId: string, @Body() dto: ChangeSettingsPinDto) {
    return this.service.changeSettingsPin(siteId, dto.currentPin, dto.newPin);
  }

  @Post('sites/:siteId/messages')
  sendMessage(@Param('siteId') siteId: string, @Body() dto: SendPanelMessageDto) {
    return this.service.sendMessage(siteId, dto.residentId, dto.body, dto.photoUrl);
  }

  // Closes the gap where calls happen entirely peer-to-peer and the
  // backend never otherwise learns about them.
  @Post('sites/:siteId/log-call-event')
  logCallEvent(@Param('siteId') siteId: string, @Body() dto: LogCallEventDto) {
    return this.service.logCallEvent(siteId, dto.residentId, dto.eventType);
  }

  // QR scan verification happens fully offline on the panel — this is how
  // the backend otherwise learns it happened at all, since there's no
  // other server round-trip in that flow to hang an audit write off of.
  @Post('sites/:siteId/log-unlock-event')
  logUnlockEvent(@Param('siteId') siteId: string, @Body() dto: LogUnlockEventDto) {
    return this.service.logUnlockEvent(siteId, dto.entryPointId, dto.unitId, dto.method ?? 'virtual_key');
  }

  // Panel's own Activity screen (PIN-gated) — was a full placeholder with
  // no backend endpoint at all until now. Scoped to this device's own
  // entry point, includes the resident's name per event since a bare
  // event_type + timestamp isn't useful on its own.
  @Get('entry-points/:entryPointId/activity')
  getEntryPointActivity(@Param('entryPointId') entryPointId: string, @Query('cursor') cursor?: string) {
    return this.auditEvents.findForEntryPoint(entryPointId, cursor);
  }

  // The panel's Door PIN screen previously checked against a hardcoded
  // mock code and never actually reached the backend at all — this is
  // the real verification, finally wired up.
  @Post('sites/:siteId/verify-door-pin')
  async verifyDoorPin(@Param('siteId') siteId: string, @Body() dto: VerifyDoorPinDto) {
    const result = await this.residents.verifyDoorPin(siteId, dto.pin);
    if (result.valid && dto.entryPointId) {
      await this.service.logUnlockEvent(siteId, dto.entryPointId, result.unitId, 'door_pin').catch(() => {});
    }
    return result;
  }
}
