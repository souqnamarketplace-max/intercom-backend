import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { assertOwnerScope } from '../common/tenant-scope.util';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';

const ACTIVITY_PAGE_SIZE = 30;

@Injectable()
export class ResidentsService {
  constructor(private prisma: PrismaService) {}

  private async assertUnitScope(user: AuthUser, unitId: string) {
    const unit = await this.prisma.unit.findUnique({ where: { id: unitId }, include: { site: true } });
    if (!unit) throw new NotFoundException('Unit not found');
    assertOwnerScope(user, unit.site.ownerId);
    return unit;
  }

  // Admin-created and linked — residents do not self-register additional
  // household members. A unit can have multiple resident rows.
  async create(user: AuthUser, dto: CreateResidentDto) {
    await this.assertUnitScope(user, dto.unitId);
    const inviteCode = randomBytes(6).toString('hex');
    return this.prisma.resident.create({ data: { ...dto, inviteCode } });
  }

  async findOne(user: AuthUser, id: string) {
    const resident = await this.prisma.resident.findUnique({
      where: { id },
      include: { unit: { include: { site: true } } },
    });
    if (!resident) throw new NotFoundException('Resident not found');
    assertOwnerScope(user, resident.unit.site.ownerId);
    return resident;
  }

  // Called from the resident's own JWT — no owner-scope check needed since
  // a resident can only ever be "themselves," there's no ID to iterate.
  async findSelf(residentId: string) {
    const resident = await this.prisma.resident.findUnique({
      where: { id: residentId },
      include: { unit: { include: { site: true } } },
    });
    if (!resident) throw new NotFoundException('Resident not found');
    return {
      id: resident.id,
      name: resident.name,
      email: resident.email,
      phone: resident.phone,
      unitId: resident.unitId,
      unitNumber: resident.unit.unitNumber,
      siteId: resident.unit.siteId,
      siteName: resident.unit.site.name,
      notificationsEnabled: resident.notificationsEnabled,
      hasDoorPin: !!resident.pinHash,
    };
  }

  async findMyMessages(residentId: string) {
    return this.prisma.residentMessage.findMany({
      where: { residentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Resident self-service contact info + notification preference. Deliberately
  // narrow — email/phone/notificationsEnabled only, never status/access/lifecycle
  // fields, same principle as the partner API's residents PATCH endpoint.
  async updateSelf(residentId: string, dto: { email?: string; phone?: string; notificationsEnabled?: boolean }) {
    return this.prisma.resident.update({
      where: { id: residentId },
      data: dto,
      select: { id: true, email: true, phone: true, notificationsEnabled: true },
    });
  }

  // Sets/replaces the resident's own Door PIN (used at the panel keypad,
  // distinct from Delivery Pass PINs). Hashed the same way as card fobs and
  // delivery-authorization PINs elsewhere in this codebase — not a login
  // credential, so sha256 matches the existing pattern rather than bcrypt.
  async setPin(residentId: string, rawPin: string) {
    const pinHash = createHash('sha256').update(rawPin).digest('hex');
    await this.prisma.resident.update({ where: { id: residentId }, data: { pinHash } });
    return { hasDoorPin: true };
  }

  // Panel-facing: verifies a Door PIN typed on the keypad. The panel only
  // knows the site (and now entry point) — not which resident is typing —
  // so this searches active residents at the site for a matching hash,
  // same approach Delivery Pass PINs already use. This endpoint was the
  // real gap: the panel's Door PIN screen was still checking against a
  // hardcoded mock code and never actually called this at all.
  async verifyDoorPin(siteId: string, rawPin: string) {
    const pinHash = createHash('sha256').update(rawPin).digest('hex');
    const resident = await this.prisma.resident.findFirst({
      where: { pinHash, status: 'active', unit: { siteId } },
      select: { id: true, name: true, unitId: true },
    });
    if (!resident) return { valid: false as const };
    return { valid: true as const, residentId: resident.id, residentName: resident.name, unitId: resident.unitId };
  }

  // A resident's own activity — everything tied to their unit (any household
  // member's access) plus anything tied to them personally (e.g. calls they
  // answered). Cursor-paginated like the staff audit trail, since this is
  // reading from the same high-write-volume table.
  async findMyActivity(residentId: string, unitId: string, cursor?: string) {
    const events = await this.prisma.auditEvent.findMany({
      where: { OR: [{ unitId }, { residentId }] },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: ACTIVITY_PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasNextPage = events.length > ACTIVITY_PAGE_SIZE;
    const page = hasNextPage ? events.slice(0, ACTIVITY_PAGE_SIZE) : events;
    return { events: page, nextCursor: hasNextPage ? page[page.length - 1].id : null };
  }

  // The doors a resident can actually reach: entry points open to everyone
  // (openToAllZones) plus any explicitly granted to their unit's zone. A
  // unit with no zone assigned yet sees common areas only, never a random
  // building's door — the safer default we settled on, since zone
  // assignment is the actual access-granting mechanism here.
  async findMyAccessPoints(residentId: string) {
    const resident = await this.prisma.resident.findUnique({
      where: { id: residentId },
      include: { unit: true },
    });
    if (!resident) throw new NotFoundException('Resident not found');

    const siteId = resident.unit.siteId;
    const zoneId = resident.unit.zoneId;

    return this.prisma.entryPoint.findMany({
      where: {
        siteId,
        OR: [
          { openToAllZones: true },
          ...(zoneId ? [{ zoneAccess: { some: { zoneId } } }] : []),
        ],
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  // "Swipe to Open" from the app — now targets a specific door the resident
  // picked, verified against their actual access (same rule as
  // findMyAccessPoints) rather than defaulting to the site's first entry
  // point. No physical Pi/relay to actually trigger yet, but the access
  // check and audit log are real.
  async openDoor(residentId: string, entryPointId: string, photoUrl?: string) {
    const accessible = await this.findMyAccessPoints(residentId);
    if (!accessible.some((ep) => ep.id === entryPointId)) {
      throw new NotFoundException('You don\u2019t have access to that door');
    }

    const resident = await this.prisma.resident.findUnique({ where: { id: residentId } });
    if (!resident) throw new NotFoundException('Resident not found');

    const entryPoint = await this.prisma.entryPoint.findUnique({ where: { id: entryPointId } });
    if (!entryPoint) throw new NotFoundException('Entry point not found');

    return this.prisma.auditEvent.create({
      data: {
        siteId: entryPoint.siteId,
        unitId: resident.unitId,
        residentId: resident.id,
        entryPointId,
        eventType: 'unlock_app',
        method: 'app',
        result: 'success',
        photoUrl,
      },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateResidentDto) {
    await this.findOne(user, id);
    return this.prisma.resident.update({ where: { id }, data: dto });
  }

  // Suspend: disables all access methods (enforced by the auth/unlock code paths
  // checking status === 'active'), reversible, does NOT delete the record.
  async suspend(user: AuthUser, id: string) {
    await this.findOne(user, id);
    return this.prisma.resident.update({ where: { id }, data: { status: 'suspended' } });
  }

  async reactivate(user: AuthUser, id: string) {
    await this.findOne(user, id);
    return this.prisma.resident.update({ where: { id }, data: { status: 'active' } });
  }

  // Move-out / delete: soft delete. Also cascades to auto-invalidate any
  // virtual keys this resident issued, per the documented lifecycle rule.
  async moveOut(user: AuthUser, id: string) {
    await this.findOne(user, id);
    return this.prisma.$transaction([
      this.prisma.resident.update({ where: { id }, data: { status: 'deleted', directoryVisible: false } }),
      this.prisma.virtualKey.updateMany({
        where: { issuedByResidentId: id, status: 'active' },
        data: { status: 'revoked' },
      }),
    ]);
  }
}
