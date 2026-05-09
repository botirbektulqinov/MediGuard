import { ForbiddenException, Injectable } from '@nestjs/common';

import type { AuthenticatedUser } from './types/authenticated-user';

@Injectable()
export class OwnershipService {
  assertSelfOrPermission(ownerUserId: string, user: AuthenticatedUser, permission: string): void {
    if (user.id === ownerUserId) {
      return;
    }

    if (user.permissions.includes(permission)) {
      return;
    }

    throw new ForbiddenException('You are not allowed to access this resource.');
  }
}
