import { SetMetadata } from '@nestjs/common';
import { PartnerApiScope } from '../scopes';

export const REQUIRED_SCOPES_KEY = 'requiredScopes';
export const RequireScopes = (...scopes: PartnerApiScope[]) => SetMetadata(REQUIRED_SCOPES_KEY, scopes);
