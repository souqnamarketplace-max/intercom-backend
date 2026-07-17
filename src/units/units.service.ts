import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { assertOwnerScope } from '../common/tenant-scope.util';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  // Fields staff should see for each resident nested under a unit. Excludes
  // pinHash (a hash, but still no reason to ship it) and otpCode/otpExpiresAt
  // (the literal one-time password — this was previously leaking to the
  // dashboard via `include: { residents: true }`, since that returns every
  // column with no filtering). inviteCode is intentionally included: staff
  // need to copy/share it manually until real SMS/email delivery is wired up.
  private readonly residentSummarySelect = {
    id: true,
    unitId: true,
    name: true,
    email: true,
    phone: true,
    status: true,
    directoryVisible: true,
    notificationsEnabled: true,
    inviteCode: true,
    appAccountCreated: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  async create(user: AuthUser, dto: CreateUnitDto) {
    const site = await this.prisma.site.findUnique({ where: { id: dto.siteId } });
    if (!site) throw new NotFoundException('Site not found');
    assertOwnerScope(user, site.ownerId);
    return this.prisma.unit.create({ data: dto });
  }

  async findAllForSite(user: AuthUser, siteId: string) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Site not found');
    assertOwnerScope(user, site.ownerId);
    // Every unit -> its residents, since a unit can have multiple resident accounts
    return this.prisma.unit.findMany({
      where: { siteId },
      include: { residents: { select: this.residentSummarySelect } },
      orderBy: { unitNumber: 'asc' },
    });
  }

  async findOne(user: AuthUser, id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: { site: true, residents: { select: this.residentSummarySelect } },
    });
    if (!unit) throw new NotFoundException('Unit not found');
    assertOwnerScope(user, unit.site.ownerId);
    return unit;
  }

  async update(user: AuthUser, id: string, dto: UpdateUnitDto) {
    const unit = await this.findOne(user, id);
    if (dto.zoneId) {
      const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });
      if (!zone || zone.siteId !== unit.siteId) {
        throw new NotFoundException('Zone not found on this site');
      }
    }
    return this.prisma.unit.update({ where: { id }, data: dto });
  }

  async remove(user: AuthUser, id: string) {
    await this.findOne(user, id);
    return this.prisma.unit.delete({ where: { id } });
  }
}
