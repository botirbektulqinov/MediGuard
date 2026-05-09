export interface AuthenticatedUser {
  id: string;
  email: string;
  status: 'ACTIVE' | 'DISABLED';
  roles: string[];
  permissions: string[];
}

export interface RequestContext {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}
