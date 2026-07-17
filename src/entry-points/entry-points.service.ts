import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { assertOwnerScope } from '../common/tenant-scope.util';
import { CreateEntryPointDto } from './dto/create-entry-point.dto';
import { UpdateEntryPointDto } from './dto/update-entry-point.dto';

@Injectable()
export class EntryPointsService {
  constructor(private prisma: PrismaService) {}

  async create(user: AuthUser, dto: CreateEntryPointDto) {
    const site = await this.prisma.site.findUnique({ where: { id: dto.siteId } });
    if (!site) throw new NotFoundException('Site not found');
    assertOwnerScope(user, site.ownerId);
    return this.prisma.entryPoint.create({ data: dto });
  }

  async findAllForSite(user: AuthUser, siteId: string) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Site not found');
    assertOwnerScope(user, site.ownerId);
    return this.prisma.entryPoint.findMany({
      where: { siteId },
      include: { devices: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: AuthUser, id: string) {
    const entryPoint = await this.prisma.entryPoint.findUnique({
      where: { id },
      include: { site: true, devices: true },
    });
    if (!entryPoint) throw new NotFoundException('Entry point not found');
    assertOwnerScope(user, entryPoint.site.ownerId);
    return entryPoint;
  }

  async update(user: AuthUser, id: string, dto: UpdateEntryPointDto) {
    await this.findOne(user, id);
    return this.prisma.entryPoint.update({ where: { id }, data: dto });
  }

  async remove(user: AuthUser, id: string) {
    await this.findOne(user, id);
    return this.prisma.entryPoint.delete({ where: { id } });
  }
}
