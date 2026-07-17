import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { assertOwnerScope } from '../common/tenant-scope.util';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';

@Injectable()
export class ZonesService {
  constructor(private prisma: PrismaService) {}

  async create(user: AuthUser, dto: CreateZoneDto) {
    const site = await this.prisma.site.findUnique({ where: { id: dto.siteId } });
    if (!site) throw new NotFoundException('Site not found');
    assertOwnerScope(user, site.ownerId);
    return this.prisma.zone.create({ data: dto });
  }

  async findAllForSite(user: AuthUser, siteId: string) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Site not found');
    assertOwnerScope(user, site.ownerId);
    // Include units so the dashboard can show zone -> unit membership directly,
    // and entryPoints so it can show/edit which doors this zone can access.
    return this.prisma.zone.findMany({
      where: { siteId },
      include: { units: true, entryPoints: { include: { entryPoint: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(user: AuthUser, id: string) {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: { site: true, units: true, entryPoints: { include: { entryPoint: true } } },
    });
    if (!zone) throw new NotFoundException('Zone not found');
    assertOwnerScope(user, zone.site.ownerId);
    return zone;
  }

  // Replaces the full set of entry points this zone can access — simpler
  // for a checkbox-list UI than add/remove endpoints, and the set is small
  // enough per zone that a full replace is cheap.
  async setEntryPointAccess(user: AuthUser, zoneId: string, entryPointIds: string[]) {
    const zone = await this.findOne(user, zoneId);
    const validEntryPoints = await this.prisma.entryPoint.findMany({
      where: { id: { in: entryPointIds }, siteId: zone.siteId },
      select: { id: true },
    });
    const validIds = validEntryPoints.map((ep) => ep.id);

    await this.prisma.$transaction([
      this.prisma.zoneEntryPoint.deleteMany({ where: { zoneId } }),
      this.prisma.zoneEntryPoint.createMany({
        data: validIds.map((entryPointId) => ({ zoneId, entryPointId })),
      }),
    ]);

    return this.findOne(user, zoneId);
  }

  async update(user: AuthUser, id: string, dto: UpdateZoneDto) {
    await this.findOne(user, id);
    return this.prisma.zone.update({ where: { id }, data: dto });
  }

  async remove(user: AuthUser, id: string) {
    await this.findOne(user, id);
    // Units referencing this zone fall back to zoneId: null via onDelete: SetNull
    return this.prisma.zone.delete({ where: { id } });
  }
}
