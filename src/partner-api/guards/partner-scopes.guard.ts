import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_SCOPES_KEY } from '../decorators/require-scopes.decorator';
import { PartnerAuthContext } from './partner-api-key.guard';

// Must run AFTER PartnerApiKeyGuard on the same route (relies on
// request.partnerAuth already being set).
@Injectable()
export class PartnerScopesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(REQUIRED_SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredScopes || requiredScopes.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const partnerAuth: PartnerAuthContext = request.partnerAuth;
    if (!partnerAuth) return false;

    const hasAllScopes = requiredScopes.every((scope) => partnerAuth.scopes.includes(scope));
    if (!hasAllScopes) {
      throw new ForbiddenException(`This API key is missing required scope(s): ${requiredScopes.join(', ')}`);
    }
    return true;
  }
}
