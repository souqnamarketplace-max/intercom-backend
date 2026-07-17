import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { assertOwnerScope } from '../common/tenant-scope.util';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

@Injectable()
export class SitesService {
  constructor(private prisma: PrismaService) {}

  private generateSetupCode(): string {
    // Human-typeable on a panel keyboard: 8 chars, uppercase hex-ish.
    return randomBytes(4).toString('hex').toUpperCase();
  }

  create(user: AuthUser, dto: CreateSiteDto) {
    assertOwnerScope(user, dto.ownerId);
    return this.prisma.site.create({ data: { ...dto, panelSetupCode: this.generateSetupCode() } });
  }

  // platform_admin sees every site; everyone else sees only their own owner's sites
  findAll(user: AuthUser) {
    const where = user.role === 'platform_admin' ? {} : { ownerId: user.ownerId! };
    return this.prisma.site.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async findOne(user: AuthUser, id: string) {
    const site = await this.prisma.site.findUnique({ where: { id } });
    if (!site) throw new NotFoundException('Site not found');
    assertOwnerScope(user, site.ownerId);
    return site;
  }

  async update(user: AuthUser, id: string, dto: UpdateSiteDto) {
    const site = await this.findOne(user, id); // also asserts scope

    if (dto.frontDeskResidentId) {
      const resident = await this.prisma.resident.findUnique({
        where: { id: dto.frontDeskResidentId },
        include: { unit: true },
      });
      if (!resident || resident.unit.siteId !== site.id) {
        throw new NotFoundException('That resident is not part of this site');
      }
    }

    return this.prisma.site.update({ where: { id }, data: dto });
  }

  async remove(user: AuthUser, id: string) {
    await this.findOne(user, id);
    return this.prisma.site.delete({ where: { id } });
  }

  // Rotates the site's pairing code — old code stops working immediately.
  // Doesn't affect already-paired panels/Pis; they keep their own identity
  // (deviceId/entryPointId) once claimed, this only gates new pairings.
  async regenerateSetupCode(user: AuthUser, id: string) {
    await this.findOne(user, id);
    return this.prisma.site.update({ where: { id }, data: { panelSetupCode: this.generateSetupCode() } });
  }
}
