import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { assertOwnerScope } from '../common/tenant-scope.util';
import { CreateSiteIntegrationDto } from './dto/create-site-integration.dto';

@Injectable()
export class SiteIntegrationsService {
  constructor(private prisma: PrismaService) {}

  async create(user: AuthUser, dto: CreateSiteIntegrationDto) {
    const site = await this.prisma.site.findUnique({ where: { id: dto.siteId } });
    if (!site) throw new NotFoundException('Site not found');
    assertOwnerScope(user, site.ownerId);
    return this.prisma.siteIntegration.create({ data: dto });
  }

  async findAllForSite(user: AuthUser, siteId: string) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Site not found');
    assertOwnerScope(user, site.ownerId);
    return this.prisma.siteIntegration.findMany({ where: { siteId } });
  }
}
