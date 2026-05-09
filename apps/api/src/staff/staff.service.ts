import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { ClinicAccessService } from '../clinics/clinic-access.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateStaffProfileDto } from './dto/create-staff-profile.dto';
import type { UpdateStaffProfileDto } from './dto/update-staff-profile.dto';

@Injectable()
export class StaffService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(ClinicAccessService) private readonly clinicAccessService: ClinicAccessService,
  ) {}

  async list(user: AuthenticatedUser) {
    const clinicIds = await this.clinicAccessService.accessibleClinicIds(user);

    return this.prisma.staffProfile.findMany({
      ...(clinicIds ? { where: { clinicId: { in: clinicIds } } } : {}),
      orderBy: [{ clinic: { name: 'asc' } }, { employeeCode: 'asc' }],
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
        clinic: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        doctorProfile: true,
      },
    });
  }

  async create(input: CreateStaffProfileDto, user: AuthenticatedUser, context: RequestContext) {
    await this.clinicAccessService.assertCanAccessClinic(user, input.clinicId);
    await this.assertReferences(
      input.userId,
      input.clinicId,
      input.branchId,
      input.doctorProfile?.consultationRoomId,
    );

    try {
      const data: Prisma.StaffProfileUncheckedCreateInput = {
        userId: input.userId,
        clinicId: input.clinicId,
        employeeCode: input.employeeCode,
        jobTitle: input.jobTitle,
        department: input.department,
        isActive: input.isActive ?? true,
      };
      if (input.branchId !== undefined) data.branchId = input.branchId;
      if (input.phone !== undefined) data.phone = input.phone;
      if (input.doctorProfile) {
        data.doctorProfile = {
          create: this.doctorProfileCreateInput(input.doctorProfile),
        };
      }

      const staff = await this.prisma.staffProfile.create({
        data,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, status: true },
          },
          clinic: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          doctorProfile: true,
        },
      });

      await this.auditLogService.create({
        actorUserId: user.id,
        action: 'STAFF_PROFILE_CREATED',
        resourceType: 'StaffProfile',
        resourceId: staff.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return staff;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Staff profile already exists for this user or employee code.');
      }
      throw error;
    }
  }

  async update(
    id: string,
    input: UpdateStaffProfileDto,
    user: AuthenticatedUser,
    context: RequestContext,
  ) {
    const existingStaff = await this.assertStaffExists(id);
    await this.clinicAccessService.assertCanAccessClinic(user, existingStaff.clinicId);
    const targetClinicId = input.clinicId ?? existingStaff.clinicId;
    if (input.clinicId) {
      await this.clinicAccessService.assertCanAccessClinic(user, input.clinicId);
    }
    if (
      input.userId ||
      input.clinicId ||
      input.branchId ||
      input.doctorProfile?.consultationRoomId
    ) {
      await this.assertReferences(
        input.userId,
        targetClinicId,
        input.branchId,
        input.doctorProfile?.consultationRoomId,
      );
    }

    try {
      const data: Prisma.StaffProfileUncheckedUpdateInput = {};
      if (input.userId !== undefined) data.userId = input.userId;
      if (input.clinicId !== undefined) data.clinicId = input.clinicId;
      if (input.branchId !== undefined) data.branchId = input.branchId;
      if (input.employeeCode !== undefined) data.employeeCode = input.employeeCode;
      if (input.jobTitle !== undefined) data.jobTitle = input.jobTitle;
      if (input.department !== undefined) data.department = input.department;
      if (input.phone !== undefined) data.phone = input.phone;
      if (input.isActive !== undefined) data.isActive = input.isActive;
      if (input.doctorProfile) {
        const doctorProfile = this.doctorProfileCreateInput(input.doctorProfile);
        data.doctorProfile = {
          upsert: {
            create: doctorProfile,
            update: doctorProfile,
          },
        };
      }

      const staff = await this.prisma.staffProfile.update({
        where: { id },
        data,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, status: true },
          },
          clinic: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          doctorProfile: true,
        },
      });

      await this.auditLogService.create({
        actorUserId: user.id,
        action: 'STAFF_PROFILE_UPDATED',
        resourceType: 'StaffProfile',
        resourceId: staff.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return staff;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Staff profile already exists for this user or employee code.');
      }
      throw error;
    }
  }

  private async assertReferences(
    userId?: string,
    clinicId?: string,
    branchId?: string,
    consultationRoomId?: string,
  ): Promise<void> {
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!user) {
        throw new NotFoundException('User not found.');
      }
    }
    if (clinicId) {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { id: true },
      });
      if (!clinic) {
        throw new NotFoundException('Clinic not found.');
      }
    }
    if (branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true, clinicId: true },
      });
      if (!branch) {
        throw new NotFoundException('Branch not found.');
      }
      if (clinicId && branch.clinicId !== clinicId) {
        throw new NotFoundException('Branch not found for clinic.');
      }
    }
    if (consultationRoomId) {
      const room = await this.prisma.room.findUnique({
        where: { id: consultationRoomId },
        select: { id: true, branch: { select: { clinicId: true } } },
      });
      if (!room) {
        throw new NotFoundException('Consultation room not found.');
      }
      if (clinicId && room.branch.clinicId !== clinicId) {
        throw new NotFoundException('Consultation room not found for clinic.');
      }
    }
  }

  private async assertStaffExists(id: string): Promise<{ id: string; clinicId: string }> {
    const staff = await this.prisma.staffProfile.findUnique({
      where: { id },
      select: { id: true, clinicId: true },
    });
    if (!staff) {
      throw new NotFoundException('Staff profile not found.');
    }
    return staff;
  }

  private doctorProfileCreateInput(input: NonNullable<CreateStaffProfileDto['doctorProfile']>) {
    const data: Prisma.DoctorProfileUncheckedCreateWithoutStaffProfileInput = {
      specialty: input.specialty,
      licenseNumber: input.licenseNumber,
      schedule: input.schedule ? (input.schedule as Prisma.InputJsonValue) : Prisma.JsonNull,
    };
    if (input.consultationRoomId !== undefined) {
      data.consultationRoomId = input.consultationRoomId;
    }
    return data;
  }
}
