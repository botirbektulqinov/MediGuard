import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClinicAccessService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  isPlatformAdmin(user: AuthenticatedUser): boolean {
    return user.roles.includes('SUPER_ADMIN');
  }

  async accessibleClinicIds(user: AuthenticatedUser): Promise<string[] | null> {
    if (this.isPlatformAdmin(user)) {
      return null;
    }

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId: user.id },
      select: { clinicId: true, isActive: true },
    });

    if (!staffProfile?.isActive) {
      return [];
    }

    return [staffProfile.clinicId];
  }

  async assertCanAccessClinic(user: AuthenticatedUser, clinicId: string): Promise<void> {
    const clinicIds = await this.accessibleClinicIds(user);
    if (clinicIds === null || clinicIds.includes(clinicId)) {
      return;
    }

    throw new ForbiddenException('You are not allowed to access this clinic.');
  }

  async assertPlatformAdminForClinicCreation(user: AuthenticatedUser): Promise<void> {
    if (!this.isPlatformAdmin(user)) {
      throw new ForbiddenException('Only platform administrators can create clinics.');
    }
  }
}
