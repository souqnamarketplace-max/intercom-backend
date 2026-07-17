import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { assertOwnerScope } from '../common/tenant-scope.util';
import { CreateAuditEventDto } from './dto/create-audit-event.dto';

const PAGE_SIZE = 50;

@Injectable()
export class AuditEventsService {
  constructor(private prisma: PrismaService) {}

  // Called by panel/Pi devices reporting events — needs its own device-auth
  // strategy before real hardware use (see README). Open for testing now.
  create(dto: CreateAuditEventDto) {
    return this.prisma.auditEvent.create({ data: dto });
  }

  /**
   * audit_events is the highest-write-volume table in the system, so this
   * uses cursor/keyset pagination on (created_at, id) rather than offset —
   * offset pagination degrades and can skip/duplicate rows as new events
   * are inserted while a dashboard user is scrolling through history.
   */
  async findForSite(user: AuthUser, siteId: string, cursor?: string) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Site not found');
    assertOwnerScope(user, site.ownerId);

    const events = await this.prisma.auditEvent.findMany({
      where: { siteId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1, // fetch one extra to know if there's a next page
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasNextPage = events.length > PAGE_SIZE;
    const page = hasNextPage ? events.slice(0, PAGE_SIZE) : events;

    return {
      events: page,
      nextCursor: hasNextPage ? page[page.length - 1].id : null,
    };
  }

  // Panel-facing: what a device shows on its own PIN-gated Activity screen —
  // previously a full placeholder since this endpoint never existed. Scoped
  // to the device's own entry point (not the whole site, which is staff-only
  // territory), and joins the resident's name in directly since "which
  // resident" is the whole point of a per-door activity view — a bare
  // event_type + timestamp isn't useful on its own.
  async findForEntryPoint(entryPointId: string, cursor?: string) {
    const events = await this.prisma.auditEvent.findMany({
      where: { entryPointId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { resident: { select: { name: true } } },
    });

    const hasNextPage = events.length > PAGE_SIZE;
    const page = hasNextPage ? events.slice(0, PAGE_SIZE) : events;

    return {
      events: page.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        method: e.method,
        result: e.result,
        createdAt: e.createdAt,
        residentName: e.resident?.name ?? null,
        carrierName: (e.metadata as { carrierName?: string } | null)?.carrierName ?? null,
      })),
      nextCursor: hasNextPage ? page[page.length - 1].id : null,
    };
  }
}
