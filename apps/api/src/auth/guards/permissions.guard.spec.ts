import type { Reflector } from '@nestjs/core';

import { PermissionsGuard } from './permissions.guard';

function executionContext(userPermissions: string[]) {
  return {
    getHandler: () => 'handler',
    getClass: () => 'class',
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          roles: [],
          permissions: userPermissions,
        },
      }),
    }),
  } as never;
}

describe('PermissionsGuard', () => {
  it('allows users with all required permissions', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['audit.read', 'security.read']),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(guard.canActivate(executionContext(['audit.read', 'security.read']))).toBe(true);
  });

  it('blocks users missing a required permission', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['audit.read', 'security.read']),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(guard.canActivate(executionContext(['audit.read']))).toBe(false);
  });
});
