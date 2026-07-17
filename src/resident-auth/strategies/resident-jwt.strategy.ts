import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface ResidentJwtPayload {
  sub: string;
  unitId: string;
  siteId: string;
  type: 'resident';
}

// Separate strategy name ('resident-jwt') from staff auth's default 'jwt' —
// residents are a different table/model entirely, not staff with a lower role.
@Injectable()
export class ResidentJwtStrategy extends PassportStrategy(Strategy, 'resident-jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: ResidentJwtPayload) {
    if (payload.type !== 'resident') return null; // reject staff tokens on resident routes
    return { id: payload.sub, unitId: payload.unitId, siteId: payload.siteId };
  }
}
