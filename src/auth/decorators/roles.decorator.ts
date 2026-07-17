import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Usage: @Roles('platform_admin', 'owner_admin')
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
