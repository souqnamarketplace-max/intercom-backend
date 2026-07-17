import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { assertOwnerScope } from '../common/tenant-scope.util';
import { CreateCardFobDto } from './dto/create-card-fob.dto';

@Injectable()
export class CardFobsService {
  constructor(private prisma: PrismaService) {}

  private hashCardId(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  async create(user: AuthUser, dto: CreateCardFobDto) {
    const site = await this.prisma.site.findUnique({ where: { id: dto.siteId } });
    if (!site) throw new NotFoundException('Site not found');
    assertOwnerScope(user, site.ownerId);

    return this.prisma.cardFob.create({
      data: {
        siteId: dto.siteId,
        residentId: dto.residentId,
        label: dto.label,
        hashedCardId: this.hashCardId(dto.rawCardId),
      },
    });
  }

  async findOne(user: AuthUser, id: string) {
    const fob = await this.prisma.cardFob.findUnique({ where: { id }, include: { site: true } });
    if (!fob) throw new NotFoundException('Card fob not found');
    assertOwnerScope(user, fob.site.ownerId);
    return fob;
  }

  async setStatus(user: AuthUser, id: string, status: 'active' | 'suspended' | 'revoked' | 'lost_stolen') {
    await this.findOne(user, id);
    return this.prisma.cardFob.update({ where: { id }, data: { status } });
  }

  // Used by the Pi's Wiegand-tap verification path — checked against the
  // locally-cached whitelist first; this endpoint is what populates that cache.
  async findActiveForSite(siteId: string) {
    return this.prisma.cardFob.findMany({ where: { siteId, status: 'active' } });
  }
}
