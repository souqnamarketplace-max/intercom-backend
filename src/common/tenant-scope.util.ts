import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../auth/decorators/current-user.decorator';

/**
 * Multi-tenant isolation is enforced here, at the query layer, deliberately —
 * not just hidden in the dashboard UI. Every service method that loads a
 * resource scoped to an owner (directly or via its site) must call this
 * immediately after the DB fetch and before returning/mutating anything.
 *
 * platform_admin bypasses scoping entirely (sees everything).
 * Every other role must belong to the same owner as the resource.
 */
export function assertOwnerScope(user: AuthUser, resourceOwnerId: string): void {
  if (user.role === 'platform_admin') return;

  if (!user.ownerId || user.ownerId !== resourceOwnerId) {
    throw new ForbiddenException('You do not have access to this resource');
  }
}
