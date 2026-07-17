import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { assertOwnerScope } from '../common/tenant-scope.util';
import { CreateDeliveryAuthorizationDto } from './dto/create-delivery-authorization.dto';
import { UpdateDeliveryAuthorizationDto } from './dto/update-delivery-authorization.dto';

@Injectable()
export class DeliveryAuthorizationsService {
  constructor(private prisma: PrismaService) {}

  private hashPin(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  async create(user: AuthUser, dto: CreateDeliveryAuthorizationDto) {
    const site = await this.prisma.site.findUnique({ where: { id: dto.siteId } });
    if (!site) throw new NotFoundException('Site not found');
    assertOwnerScope(user, site.ownerId);

    const existing = await this.prisma.deliveryAuthorization.findUnique({
      where: { siteId_carrierName: { siteId: dto.siteId, carrierName: dto.carrierName } },
    });
    if (existing) throw new ConflictException('A delivery authorization for this carrier already exists on this site');

    return this.prisma.deliveryAuthorization.create({
      data: {
        siteId: dto.siteId,
        carrierName: dto.carrierName,
        pinHash: this.hashPin(dto.rawPin),
        timeWindow: dto.timeWindow ?? { openAllDay: true },
      },
    });
  }

  async findAllForSite(user: AuthUser, siteId: string) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Site not found');
    assertOwnerScope(user, site.ownerId);
    return this.prisma.deliveryAuthorization.findMany({
      where: { siteId },
      orderBy: { carrierName: 'asc' },
    });
  }

  async findOne(user: AuthUser, id: string) {
    const auth = await this.prisma.deliveryAuthorization.findUnique({
      where: { id },
      include: { site: true },
    });
    if (!auth) throw new NotFoundException('Delivery authorization not found');
    assertOwnerScope(user, auth.site.ownerId);
    return auth;
  }

  async update(user: AuthUser, id: string, dto: UpdateDeliveryAuthorizationDto) {
    await this.findOne(user, id);
    const { rawPin, ...rest } = dto;
    return this.prisma.deliveryAuthorization.update({
      where: { id },
      data: {
        ...rest,
        ...(rawPin ? { pinHash: this.hashPin(rawPin) } : {}),
      },
    });
  }

  async remove(user: AuthUser, id: string) {
    await this.findOne(user, id);
    return this.prisma.deliveryAuthorization.delete({ where: { id } });
  }

  // Used by the panel/Pi PIN-entry verification path (offline-cacheable,
  // same principle as card fob whitelist caching).
  async findActiveForSite(siteId: string) {
    return this.prisma.deliveryAuthorization.findMany({ where: { siteId, active: true } });
  }

  // Panel-facing check for standing carrier PINs (e.g. "DHL always works,
  // open all day") — distinct from the one-time Delivery Pass PINs a
  // resident generates via Virtual Keys, which are checked separately.
  // The panel's single Delivery PIN keypad checks both systems.
  async verifyPin(siteId: string, rawPin: string) {
    const hash = this.hashPin(rawPin);
    const now = new Date();
    const match = await this.prisma.deliveryAuthorization.findFirst({
      where: { siteId, pinHash: hash, active: true },
    });
    if (!match) return { valid: false as const };

    const window = match.timeWindow as { daysOfWeek?: number[]; timeStart?: string; timeEnd?: string } | null;
    if (window?.daysOfWeek?.length && !window.daysOfWeek.includes(now.getDay())) {
      return { valid: false as const };
    }
    if (window?.timeStart && window?.timeEnd) {
      const minutesNow = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = window.timeStart.split(':').map(Number);
      const [endH, endM] = window.timeEnd.split(':').map(Number);
      if (minutesNow < startH * 60 + startM || minutesNow > endH * 60 + endM) {
        return { valid: false as const };
      }
    }

    return { valid: true as const, carrierName: match.carrierName };
  }
}
