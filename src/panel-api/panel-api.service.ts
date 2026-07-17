import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PanelApiService {
  constructor(private prisma: PrismaService) {}

  async getSiteInfo(siteId: string) {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: {
        id: true,
        name: true,
        address: true,
        directoryPrivacyMode: true,
        brandingLogoUrl: true,
        buildingInfo: true,
        frontDeskLabel: true,
        customButtonLabels: true,
        securityTileEnabled: true,
        screensaverType: true,
        screensaverUrl: true,
        screensaverDelaySeconds: true,
        frontDeskResident: {
          select: { id: true, name: true },
        },
      },
    });
    if (!site) throw new NotFoundException('Site not found');
    return site;
  }

  async verifySettingsPin(siteId: string, pin: string) {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: { panelSettingsPin: true },
    });
    if (!site) throw new NotFoundException('Site not found');
    return { valid: site.panelSettingsPin === pin };
  }

  // Panel-facing self-service PIN change — the panel is already inside the
  // PIN-gated Settings screen when this is reachable, so the current PIN
  // has already been verified once to get here. Still re-verified here
  // defensively (the request could theoretically be replayed/forged since
  // this endpoint is public/device-facing like the rest of panel-api).
  async changeSettingsPin(siteId: string, currentPin: string, newPin: string) {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: { panelSettingsPin: true },
    });
    if (!site) throw new NotFoundException('Site not found');
    if (site.panelSettingsPin !== currentPin) {
      throw new BadRequestException('Current PIN is incorrect');
    }
    if (!/^\d{4,8}$/.test(newPin)) {
      throw new BadRequestException('PIN must be 4-8 digits');
    }
    await this.prisma.site.update({ where: { id: siteId }, data: { panelSettingsPin: newPin } });
    return { success: true };
  }

  async sendMessage(siteId: string, residentId: string, body: string, photoUrl?: string) {
    const resident = await this.prisma.resident.findUnique({
      where: { id: residentId },
      include: { unit: true },
    });
    if (!resident || resident.unit.siteId !== siteId) {
      throw new NotFoundException('Resident not found on this site');
    }
    return this.prisma.residentMessage.create({
      data: { siteId, residentId, body, photoUrl },
    });
  }

  // Respects two independent privacy controls already in the schema:
  // - site.directoryPrivacyMode: show unit numbers only, never resident names
  // - resident.directoryVisible: a resident can opt out of the directory entirely
  async getDirectory(siteId: string) {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: { directoryPrivacyMode: true },
    });
    if (!site) throw new NotFoundException('Site not found');

    const units = await this.prisma.unit.findMany({
      where: { siteId },
      include: {
        residents: {
          where: { directoryVisible: true, status: 'active' },
        },
      },
      orderBy: { unitNumber: 'asc' },
    });

    const entries: { unitNumber: string; displayName: string; residentId: string }[] = [];
    for (const unit of units) {
      for (const resident of unit.residents) {
        entries.push({
          unitNumber: unit.unitNumber,
          residentId: resident.id,
          displayName: site.directoryPrivacyMode ? `Unit ${unit.unitNumber}` : resident.name,
        });
      }
    }
    return entries;
  }

  // Calls happen entirely peer-to-peer via PeerJS's broker — the backend is
  // never otherwise in the loop, which is why calls never showed up in
  // Activity/Audit Trail despite the schema having call_answered/missed/
  // declined event types from the start. Panel calls this at connect/end.
  async logCallEvent(
    siteId: string,
    residentId: string,
    eventType: 'call_answered' | 'call_missed' | 'call_declined',
  ) {
    const resident = await this.prisma.resident.findUnique({
      where: { id: residentId },
      include: { unit: { include: { site: { include: { entryPoints: { take: 1 } } } } } },
    });
    if (!resident || resident.unit.siteId !== siteId) {
      throw new NotFoundException('Resident not found on this site');
    }
    const entryPoint = resident.unit.site.entryPoints[0];
    return this.prisma.auditEvent.create({
      data: {
        siteId,
        unitId: resident.unitId,
        residentId: resident.id,
        entryPointId: entryPoint?.id,
        eventType,
        method: 'video_call',
        result: eventType === 'call_answered' ? 'success' : 'no_answer',
      },
    });
  }

  // QR scan verification happens fully offline on the panel (signature +
  // revocation checked locally against cached data), so unlike PIN
  // verification, the backend never otherwise learns it happened at all.
  async logUnlockEvent(siteId: string, entryPointId: string, unitId: string | undefined, method: string) {
    return this.prisma.auditEvent.create({
      data: { siteId, entryPointId, unitId, eventType: 'unlock_virtual_key', method, result: 'success' },
    });
  }
}
