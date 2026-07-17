import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export interface VirtualKeyTokenPayload {
  keyId: string;
  siteId: string;
  unitId: string;
  keyType: string;
  schedule?: Record<string, any>;
}

/**
 * Virtual Key tokens are signed with RS256 (asymmetric) — the private key
 * lives only here, on the backend. Panels are provisioned with only the
 * PUBLIC key, so they can verify a key's signature and expiry fully offline,
 * with no way to forge new ones even if a panel itself is compromised.
 *
 * In production, VIRTUAL_KEY_PRIVATE_KEY should come from a proper secrets
 * manager (see README security notes), not a plain env var.
 */
@Injectable()
export class VirtualKeySigningService {
  constructor(private config: ConfigService) {}

  sign(payload: VirtualKeyTokenPayload, expiresAt?: Date): string {
    const privateKey = this.config.get<string>('VIRTUAL_KEY_PRIVATE_KEY');
    const options: jwt.SignOptions = { algorithm: 'RS256' };
    if (expiresAt) {
      options.expiresIn = Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    }
    return jwt.sign(payload, privateKey as string, options);
  }

  // Exposed to panels via a public panel-api endpoint — safe to hand out
  // freely since it's the public half of the keypair, and is exactly what
  // lets a panel verify a Visitor Pass QR fully offline.
  getPublicKey(): string {
    return this.config.get<string>('VIRTUAL_KEY_PUBLIC_KEY') as string;
  }

  // Reference implementation of what a panel does offline — included here so
  // the same logic can be unit-tested against real issued tokens.
  verify(token: string): VirtualKeyTokenPayload {
    const publicKey = this.config.get<string>('VIRTUAL_KEY_PUBLIC_KEY');
    return jwt.verify(token, publicKey as string, { algorithms: ['RS256'] }) as VirtualKeyTokenPayload;
  }
}
