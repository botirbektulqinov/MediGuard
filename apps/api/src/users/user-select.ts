export const safeUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  status: true,
  failedLoginCount: true,
  lockedUntil: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;
