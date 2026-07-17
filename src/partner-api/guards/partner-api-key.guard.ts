import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

export interface PartnerAuthContext {
  keyId: string;
  ownerId: string;
  scopes: string[];
}

@Injectable()
export class PartnerApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rawKey = request.headers['x-api-key'];

    if (!rawKey || typeof rawKey !== 'string') {
      throw new UnauthorizedException('Missing X-API-Key header');
    }

    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const record = await this.prisma.partnerApiKey.findUnique({ where: { keyHash } });

    if (!record || record.revokedAt) {
      throw new UnauthorizedException('Invalid or revoked API key');
    }

    // Fire-and-forget last-used tracking — doesn't block or fail the request
    this.prisma.partnerApiKey
      .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    const partnerAuth: PartnerAuthContext = {
      keyId: record.id,
      ownerId: record.ownerId,
      scopes: record.scopes,
    };
    request.partnerAuth = partnerAuth;
    return true;
  }
}
