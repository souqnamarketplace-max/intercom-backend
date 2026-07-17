import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { assertOwnerScope } from '../common/tenant-scope.util';
import { CreatePartnerApiKeyDto } from './dto/create-partner-api-key.dto';

const KEY_PREFIX = 'pk_live_';

@Injectable()
export class PartnerApiKeysService {
  constructor(private prisma: PrismaService) {}

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Issues a new key. The raw key is returned ONLY here, once — the caller
   * (dashboard) must show it to the owner immediately and tell them to
   * store it themselves; we never store or display the plaintext again.
   */
  async create(user: AuthUser, dto: CreatePartnerApiKeyDto) {
    const owner = await this.prisma.owner.findUnique({ where: { id: dto.ownerId } });
    if (!owner) throw new NotFoundException('Owner not found');
    assertOwnerScope(user, owner.id);

    const secret = randomBytes(32).toString('hex');
    const rawKey = `${KEY_PREFIX}${secret}`;
    const keyPrefix = rawKey.slice(0, KEY_PREFIX.length + 8); // enough to identify in a list, not enough to guess

    const record = await this.prisma.partnerApiKey.create({
      data: {
        ownerId: dto.ownerId,
        name: dto.name,
        scopes: dto.scopes,
        keyPrefix,
        keyHash: this.hash(rawKey),
      },
    });

    return {
      id: record.id,
      name: record.name,
      scopes: record.scopes,
      keyPrefix: record.keyPrefix,
      createdAt: record.createdAt,
      // One-time reveal — the dashboard must display this prominently and
      // warn it will never be shown again.
      apiKey: rawKey,
    };
  }

  async findAllForOwner(user: AuthUser, ownerId: string) {
    const owner = await this.prisma.owner.findUnique({ where: { id: ownerId } });
    if (!owner) throw new NotFoundException('Owner not found');
    assertOwnerScope(user, owner.id);

    const keys = await this.prisma.partnerApiKey.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
    // Never return keyHash to the client
    return keys.map(({ keyHash, ...rest }) => rest);
  }

  async revoke(user: AuthUser, id: string) {
    const key = await this.prisma.partnerApiKey.findUnique({ where: { id }, include: { owner: true } });
    if (!key) throw new NotFoundException('Partner API key not found');
    assertOwnerScope(user, key.ownerId);
    if (key.revokedAt) throw new ForbiddenException('Key already revoked');

    const { keyHash, ...rest } = await this.prisma.partnerApiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return rest;
  }
}
