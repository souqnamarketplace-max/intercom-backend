import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { assertOwnerScope } from '../common/tenant-scope.util';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

// A device counts as online if it's heartbeated within this window. Panels
// heartbeat roughly every 20-30s, so three missed beats' grace avoids
// flapping status on a single dropped request.
const ONLINE_THRESHOLD_MS = 45_000;

@Injectable()
export class DevicesService {
  constructor(private prisma: PrismaService) {}

  private withComputedStatus<T extends { lastHeartbeatAt: Date | null }>(device: T) {
    const online = !!device.lastHeartbeatAt && Date.now() - device.lastHeartbeatAt.getTime() < ONLINE_THRESHOLD_MS;
    return { ...device, online };
  }

  async create(user: AuthUser, dto: CreateDeviceDto) {
    const entryPoint = await this.prisma.entryPoint.findUnique({
      where: { id: dto.entryPointId },
      include: { site: true },
    });
    if (!entryPoint) throw new NotFoundException('Entry point not found');
    assertOwnerScope(user, entryPoint.site.ownerId);
    // Every device gets a one-time setup code at creation, so staff can
    // provision the physical/web panel immediately without a separate step.
    const setupCode = this.generateCode();
    const created = await this.prisma.device.create({ data: { ...dto, setupCode } });
    return this.withComputedStatus(created);
  }

  async findOne(user: AuthUser, id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: { entryPoint: { include: { site: true } } },
    });
    if (!device) throw new NotFoundException('Device not found');
    assertOwnerScope(user, device.entryPoint.site.ownerId);
    return this.withComputedStatus(device);
  }

  // Dashboard device-management screen: every entry point + its device(s)
  // for a site, so staff can see panel/Pi identity and online status
  // without needing to know entry point IDs in advance.
  async findAllForSite(user: AuthUser, siteId: string) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Site not found');
    assertOwnerScope(user, site.ownerId);
    const devices = await this.prisma.device.findMany({
      where: { entryPoint: { siteId } },
      include: { entryPoint: true },
      orderBy: { createdAt: 'asc' },
    });
    return devices.map((d) => this.withComputedStatus(d));
  }

  async update(user: AuthUser, id: string, dto: UpdateDeviceDto) {
    await this.findOne(user, id);
    const updated = await this.prisma.device.update({ where: { id }, data: dto });
    return this.withComputedStatus(updated);
  }

  // Regenerates the setup code — e.g. a panel was factory-reset, swapped
  // out, or a code was shared/leaked. Old code stops working immediately;
  // the entry point's history (audit events, custom buttons) is untouched
  // since it's keyed to entryPointId/deviceId, not the setup code itself.
  async regenerateSetupCode(user: AuthUser, id: string) {
    await this.findOne(user, id);
    const setupCode = this.generateCode();
    const updated = await this.prisma.device.update({
      where: { id },
      data: { setupCode, provisionedAt: null },
    });
    return this.withComputedStatus(updated);
  }

  private generateCode(): string {
    // Short enough to type on a physical panel keypad/keyboard, long enough
    // not to be brute-forceable in a reasonable window — not a secret the
    // device holds forever, just a one-time pairing code.
    return randomBytes(5).toString('hex').toUpperCase();
  }

  // Step 1 of panel pairing: validates the site's reusable code and returns
  // its existing entry points so the installer can pick the right door —
  // per decision, only existing dashboard-created entry points are offered,
  // no ad-hoc creation from the panel itself.
  async resolveSiteCode(code: string) {
    const site = await this.prisma.site.findUnique({
      where: { panelSetupCode: code },
      include: { entryPoints: { include: { devices: true }, orderBy: { name: 'asc' } } },
    });
    if (!site) return { valid: false as const };

    return {
      valid: true as const,
      siteId: site.id,
      siteName: site.name,
      entryPoints: site.entryPoints.map((ep) => ({
        id: ep.id,
        name: ep.name,
        hasPanel: ep.devices.some((d) => d.deviceType === 'panel'),
        hasPiController: ep.devices.some((d) => d.deviceType === 'pi_controller'),
      })),
    };
  }

  // Step 2: the panel claims a specific entry point for itself. Idempotent —
  // if this entry point already has a device of this type (e.g. relaunching
  // Setup on the same physical panel, or intentionally re-pairing after a
  // hardware swap), this re-provisions that existing row instead of erroring
  // or creating a duplicate (blocked anyway by the entryPointId+deviceType
  // unique constraint).
  async claimEntryPoint(siteId: string, entryPointId: string, deviceType: 'panel' | 'pi_controller') {
    const entryPoint = await this.prisma.entryPoint.findUnique({ where: { id: entryPointId } });
    if (!entryPoint || entryPoint.siteId !== siteId) return { valid: false as const };

    const existing = await this.prisma.device.findUnique({
      where: { entryPointId_deviceType: { entryPointId, deviceType } },
    });

    const device = existing
      ? await this.prisma.device.update({
          where: { id: existing.id },
          data: { setupCode: null, provisionedAt: new Date() },
        })
      : await this.prisma.device.create({
          data: {
            entryPointId,
            deviceType,
            serialNumber: `${deviceType}-auto-${randomBytes(4).toString('hex')}`,
            provisionedAt: new Date(),
          },
        });

    return { valid: true as const, deviceId: device.id, entryPointId, entryPointName: entryPoint.name, siteId };
  }

  // Called by the panel itself at first launch — resolves a one-time setup
  // code to the device's full identity, then consumes the code so it can't
  // be reused (mirrors a Wi-Fi/smart-home pairing code, not a permanent
  // credential). No staff AuthUser here; trust comes from the code itself.
  // Kept as a secondary "re-pair this exact device" path alongside the
  // newer site-code + pick-your-door flow above.
  async provision(setupCode: string) {
    const device = await this.prisma.device.findUnique({
      where: { setupCode },
      include: { entryPoint: true },
    });
    if (!device) return { valid: false as const };

    await this.prisma.device.update({
      where: { id: device.id },
      data: { setupCode: null, provisionedAt: new Date() },
    });

    return {
      valid: true as const,
      deviceId: device.id,
      entryPointId: device.entryPointId,
      entryPointName: device.entryPoint.name,
      siteId: device.entryPoint.siteId,
    };
  }

  // Called by the device itself (heartbeat) — a separate device-auth
  // strategy (not staff JWT) would harden this further, but for now trust
  // comes from possessing the deviceId, which is only known post-provisioning.
  async heartbeat(deviceId: string) {
    return this.prisma.device.update({
      where: { id: deviceId },
      data: { status: 'online', lastHeartbeatAt: new Date() },
    });
  }

  async remove(user: AuthUser, id: string) {
    await this.findOne(user, id);
    return this.prisma.device.delete({ where: { id } });
  }
}
