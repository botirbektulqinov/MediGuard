import type { Reflector } from '@nestjs/core';

import { RolesGuard } from './roles.guard';

function executionContext(userRoles: string[]) {
  return {
    getHandler: () => 'handler',
    getClass: () => 'class',
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          roles: userRoles,
          permissions: [],
        },
      }),
    }),
  } as never;
}

describe('RolesGuard', () => {
  it('allows users with a required role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['SUPER_ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(executionContext(['SUPER_ADMIN']))).toBe(true);
  });

  it('blocks users without a required role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['SECURITY_OFFICER']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(executionContext(['PATIENT']))).toBe(false);
  });
});
