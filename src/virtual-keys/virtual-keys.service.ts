import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { assertOwnerScope } from '../common/tenant-scope.util';
import { VirtualKeySigningService } from './virtual-key-signing.service';
import { CreateVirtualKeyDto } from './dto/create-virtual-key.dto';

@Injectable()
export class VirtualKeysService {
  constructor(
    private prisma: PrismaService,
    private signing: VirtualKeySigningService,
  ) {}

  private hashCode(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  // Resolves ButterflyMX-style presets into a concrete schedule + window.
  // Only 'custom' and 'recurring' take caller-supplied timing — 'business_hours'
  // and 'full_day' are fixed server-side so the UI for them is just a single
  // tap, matching the reference product's preset buttons.
  private resolveSchedule(dto: CreateVirtualKeyDto): {
    schedule: Record<string, any> | undefined;
    activatesAt?: Date;
    expiresAt?: Date;
  } {
    const preset = dto.preset ?? 'custom';
    switch (preset) {
      case 'business_hours':
        return {
          schedule: { presetType: 'business_hours', daysOfWeek: [1, 2, 3, 4, 5], timeStart: '09:00', timeEnd: '17:00' },
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        };
      case 'recurring':
        return {
          schedule: {
            presetType: 'recurring',
            daysOfWeek: dto.schedule?.daysOfWeek ?? [],
            timeStart: dto.schedule?.timeStart ?? '00:00',
            timeEnd: dto.schedule?.timeEnd ?? '23:59',
          },
          activatesAt: dto.activatesAt ? new Date(dto.activatesAt) : undefined,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        };
      case 'full_day':
        return {
          schedule: { presetType: 'full_day' },
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        };
      case 'custom':
      default:
        return {
          schedule: { presetType: 'custom' },
          activatesAt: dto.activatesAt ? new Date(dto.activatesAt) : undefined,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        };
    }
  }

  // Checks whether "now" falls inside a resolved schedule's allowed window —
  // used both at PIN-verify time and (in principle) by an offline panel doing
  // the same check locally against its cached whitelist. Business-hours and
  // recurring presets restrict by day-of-week + time-of-day on top of the
  // activatesAt/expiresAt bounds; custom and full_day only use those bounds.
  private isWithinSchedule(key: { activatesAt: Date | null; expiresAt: Date | null; schedule: unknown }, now: Date): boolean {
    if (key.activatesAt && now < key.activatesAt) return false;
    if (key.expiresAt && now > key.expiresAt) return false;

    const schedule = key.schedule as { presetType?: string; daysOfWeek?: number[]; timeStart?: string; timeEnd?: string } | null;
    if (!schedule || (schedule.presetType !== 'recurring' && schedule.presetType !== 'business_hours')) {
      return true;
    }

    if (schedule.daysOfWeek?.length && !schedule.daysOfWeek.includes(now.getDay())) return false;

    if (schedule.timeStart && schedule.timeEnd) {
      const minutesNow = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = schedule.timeStart.split(':').map(Number);
      const [endH, endM] = schedule.timeEnd.split(':').map(Number);
      const minutesStart = startH * 60 + startM;
      const minutesEnd = endH * 60 + endM;
      if (minutesNow < minutesStart || minutesNow > minutesEnd) return false;
    }

    return true;
  }

  async create(user: AuthUser, dto: CreateVirtualKeyDto) {
    if (!dto.siteId || !dto.unitId) {
      throw new BadRequestException('siteId and unitId are required');
    }
    const site = await this.prisma.site.findUnique({ where: { id: dto.siteId } });
    if (!site) throw new NotFoundException('Site not found');
    assertOwnerScope(user, site.ownerId);
    return this.createInternal({ ...dto, unitId: dto.unitId!, siteId: dto.siteId! });
  }

  // Shared by the staff-facing endpoint above and the resident-facing
  // endpoint in ResidentVisitorPassesController — tenant scoping happens
  // differently for each caller, but the actual creation logic is identical.
  // unitId/siteId are optional on the DTO itself (see comment there — the
  // resident-facing endpoint never sends them from the client), but by the
  // time either caller reaches this method, both are guaranteed real
  // strings: the staff path validates them explicitly above, and the
  // resident path force-fills them from the JWT. This narrower type is
  // what Prisma's generated client actually requires for the create() call
  // below — passing `string | undefined` type-checks fine against our own
  // DTO but fails against Prisma's stricter VirtualKeyUncheckedCreateInput.
  async createInternal(dto: Omit<CreateVirtualKeyDto, 'unitId' | 'siteId'> & { unitId: string; siteId: string }) {
    const { schedule, activatesAt, expiresAt } = this.resolveSchedule(dto);
    const accessMethod = dto.accessMethod ?? 'qr';

    if (accessMethod === 'pin') {
      // Delivery Pass: a short numeric code typed on the panel keypad,
      // not scanned. Auto-generate one if the caller didn't supply it —
      // residents generating their own pass shouldn't have to think one up.
      const rawCode = dto.rawShortCode ?? String(randomInt(100000, 999999));
      const created = await this.prisma.virtualKey.create({
        data: {
          unitId: dto.unitId,
          siteId: dto.siteId,
          issuedByResidentId: dto.issuedByResidentId,
          recipientName: dto.recipientName,
          recipientContact: dto.recipientContact,
          keyType: dto.keyType,
          accessMethod: 'pin',
          schedule,
          activatesAt,
          expiresAt,
          signedToken: '',
          shortCodeHash: this.hashCode(rawCode),
        },
      });
      // rawCode is returned once, here, and never retrievable again — same
      // pattern as partner API key issuance elsewhere in this codebase.
      return { ...created, rawShortCode: rawCode };
    }

    // Create the row first to get a keyId, then sign a token that embeds it —
    // the token IS the QR payload, no separate "QR generation service" needed.
    const created = await this.prisma.virtualKey.create({
      data: {
        unitId: dto.unitId,
        siteId: dto.siteId,
        issuedByResidentId: dto.issuedByResidentId,
        recipientName: dto.recipientName,
        recipientContact: dto.recipientContact,
        keyType: dto.keyType,
        accessMethod: 'qr',
        schedule,
        activatesAt,
        expiresAt,
        signedToken: '', // placeholder, filled in below
      },
    });

    const signedToken = this.signing.sign(
      { keyId: created.id, siteId: created.siteId, unitId: created.unitId, keyType: dto.keyType, schedule },
      expiresAt,
    );

    return this.prisma.virtualKey.update({ where: { id: created.id }, data: { signedToken } });
  }

  // Panel-facing verification for Delivery Pass PINs — checks the entered
  // code's hash against active pin-access keys for the site, then enforces
  // the full schedule window (not just expiry), so a recurring/business-hours
  // pass only unlocks during its allowed window.
  //
  // Single-use passes (keyType='delivery', the default for a resident's
  // Delivery Pass) are consumed on first successful use — previously there
  // was no consumption logic at all, so a "used" code looked identical to
  // a "wrong" one. Now a reused code gets its own distinct message instead
  // of a generic "invalid" response.
  async verifyPin(siteId: string, rawCode: string) {
    const hash = this.hashCode(rawCode);
    const now = new Date();

    // Look up regardless of status first, so we can tell "never existed /
    // wrong code" apart from "existed but was already used or revoked."
    const match = await this.prisma.virtualKey.findFirst({
      where: { siteId, accessMethod: 'pin', shortCodeHash: hash },
    });
    if (!match) return { valid: false as const, reason: 'not_found' as const };

    if (match.status === 'revoked') {
      return { valid: false as const, reason: 'already_used' as const, recipientName: match.recipientName };
    }
    if (match.status === 'expired') {
      return { valid: false as const, reason: 'expired' as const };
    }
    if (!this.isWithinSchedule(match, now)) {
      return { valid: false as const, reason: 'outside_window' as const };
    }

    // Recurring passes stay active across multiple uses within their
    // window; single-use ("delivery") passes are consumed immediately so a
    // second attempt gets the distinct "already used" message above.
    if (match.keyType !== 'recurring') {
      await this.prisma.virtualKey.update({ where: { id: match.id }, data: { status: 'revoked' } });
    }

    return { valid: true as const, keyId: match.id, recipientName: match.recipientName, unitId: match.unitId };
  }

  async revoke(user: AuthUser, id: string) {
    const key = await this.prisma.virtualKey.findUnique({ where: { id }, include: { site: true } });
    if (!key) throw new NotFoundException('Virtual key not found');
    assertOwnerScope(user, key.site.ownerId);
    return this.prisma.virtualKey.update({ where: { id }, data: { status: 'revoked' } });
  }

  // Panels sync this periodically to know which keys have been revoked before
  // their natural expiry — the offline signature check alone can't know this.
  async findRevokedForSite(siteId: string) {
    const revoked = await this.prisma.virtualKey.findMany({
      where: { siteId, status: 'revoked' },
      select: { id: true },
    });
    return revoked.map((k) => k.id);
  }

  async findAllForUnit(user: AuthUser, unitId: string) {
    const unit = await this.prisma.unit.findUnique({ where: { id: unitId }, include: { site: true } });
    if (!unit) throw new NotFoundException('Unit not found');
    assertOwnerScope(user, unit.site.ownerId);
    return this.prisma.virtualKey.findMany({ where: { unitId }, orderBy: { createdAt: 'desc' } });
  }

  // Resident-facing equivalent of findAllForUnit — no staff AuthUser exists
  // here, so isolation comes from the caller only ever passing their own
  // unitId (baked into their resident JWT), not from assertOwnerScope.
  async findAllForUnitUnscoped(unitId: string) {
    return this.prisma.virtualKey.findMany({ where: { unitId }, orderBy: { createdAt: 'desc' } });
  }

  // Resident-facing revoke — verifies the key actually belongs to the
  // calling resident's own unit before revoking, so a resident can't revoke
  // another unit's pass by guessing an ID.
  async revokeOwnedByUnit(unitId: string, id: string) {
    const key = await this.prisma.virtualKey.findUnique({ where: { id } });
    if (!key || key.unitId !== unitId) throw new NotFoundException('Virtual key not found');
    return this.prisma.virtualKey.update({ where: { id }, data: { status: 'revoked' } });
  }
}
