import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PAGE_SIZE = 50;

/**
 * Reverse-direction API: third parties (Yardi, CCTV/VMS vendors, other
 * access-control systems) call INTO the platform via a partner API key.
 * This is distinct from IntegrationAdapter (us calling OUT to their systems).
 *
 * Every method here re-verifies the requested site actually belongs to the
 * calling key's ownerId — multi-tenant isolation is enforced at the query
 * layer here exactly as it is for staff/resident auth, not left to the
 * caller behaving honestly.
 */
@Injectable()
export class PartnerApiService {
  constructor(private prisma: PrismaService) {}

  private async assertSiteOwnedBy(siteId: string, ownerId: string) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Site not found');
    if (site.ownerId !== ownerId) {
      throw new ForbiddenException('This API key does not have access to that site');
    }
    return site;
  }

  async findAuditEvents(ownerId: string, siteId: string, cursor?: string) {
    await this.assertSiteOwnedBy(siteId, ownerId);

    const events = await this.prisma.auditEvent.findMany({
      where: { siteId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasNextPage = events.length > PAGE_SIZE;
    const page = hasNextPage ? events.slice(0, PAGE_SIZE) : events;
    return { events: page, nextCursor: hasNextPage ? page[page.length - 1].id : null };
  }

  async findResidents(ownerId: string, siteId: string) {
    await this.assertSiteOwnedBy(siteId, ownerId);
    return this.prisma.resident.findMany({
      where: { unit: { siteId } },
      include: { unit: true },
    });
  }

  // Intended for PMS sync (e.g. Yardi pushing move-in/move-out/contact
  // updates) — deliberately narrow: only contact fields, never status,
  // access, or lifecycle transitions, which stay under our own control.
  async updateResidentContactInfo(
    ownerId: string,
    residentId: string,
    dto: { name?: string; email?: string; phone?: string },
  ) {
    const resident = await this.prisma.resident.findUnique({
      where: { id: residentId },
      include: { unit: { include: { site: true } } },
    });
    if (!resident) throw new NotFoundException('Resident not found');
    if (resident.unit.site.ownerId !== ownerId) {
      throw new ForbiddenException('This API key does not have access to that resident');
    }
    return this.prisma.resident.update({ where: { id: residentId }, data: dto });
  }

  async findDevices(ownerId: string, siteId: string) {
    await this.assertSiteOwnedBy(siteId, ownerId);
    return this.prisma.device.findMany({
      where: { entryPoint: { siteId } },
      select: {
        id: true,
        deviceType: true,
        status: true,
        connectionType: true,
        firmwareVersion: true,
        lastHeartbeatAt: true,
        entryPointId: true,
      },
    });
  }

  async findUnits(ownerId: string, siteId: string) {
    await this.assertSiteOwnedBy(siteId, ownerId);
    return this.prisma.unit.findMany({ where: { siteId }, include: { zone: true } });
  }
}
