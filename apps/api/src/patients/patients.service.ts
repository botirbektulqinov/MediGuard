import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { ClinicAccessService } from '../clinics/clinic-access.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePatientProfileDto } from './dto/create-patient-profile.dto';
import type { UpdatePatientContactDto } from './dto/update-patient-contact.dto';
import {
  assertCanBrowsePatients,
  assertCanUpdatePatientContact,
  assertCanViewPatient,
} from './patient-access.policy';

const patientSelect = Prisma.validator<Prisma.PatientProfileSelect>()({
  id: true,
  userId: true,
  clinicId: true,
  medicalRecordNumber: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  gender: true,
  createdAt: true,
  updatedAt: true,
  clinic: { select: { id: true, name: true } },
  contact: true,
  emergencyContacts: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      fullName: true,
      relationship: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  primaryDoctor: {
    select: {
      id: true,
      specialty: true,
      staffProfile: {
        select: {
          userId: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
  },
});

type PatientWithAccess = Prisma.PatientProfileGetPayload<{ select: typeof patientSelect }>;

@Injectable()
export class PatientsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(ClinicAccessService) private readonly clinicAccessService: ClinicAccessService,
  ) {}

  async list(user: AuthenticatedUser, search?: string) {
    assertCanBrowsePatients(user);
    const trimmedSearch = search?.trim();
    const clinicIds = await this.clinicAccessService.accessibleClinicIds(user);
    const where: Prisma.PatientProfileWhereInput | undefined = trimmedSearch
      ? {
          ...(clinicIds ? { clinicId: { in: clinicIds } } : {}),
          OR: [
            { medicalRecordNumber: { contains: trimmedSearch, mode: 'insensitive' } },
            { firstName: { contains: trimmedSearch, mode: 'insensitive' } },
            { lastName: { contains: trimmedSearch, mode: 'insensitive' } },
            { contact: { is: { email: { contains: trimmedSearch, mode: 'insensitive' } } } },
            { contact: { is: { phone: { contains: trimmedSearch, mode: 'insensitive' } } } },
          ],
        }
      : undefined;

    const scopedWhere = where ?? (clinicIds ? { clinicId: { in: clinicIds } } : undefined);

    return this.prisma.patientProfile.findMany({
      ...(scopedWhere ? { where: scopedWhere } : {}),
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 50,
      select: patientSelect,
    });
  }

  async create(input: CreatePatientProfileDto, user: AuthenticatedUser, context: RequestContext) {
    await this.clinicAccessService.assertCanAccessClinic(user, input.clinicId);
    await this.assertCreateReferences(input);

    try {
      const patient = await this.prisma.patientProfile.create({
        data: {
          userId: input.userId ?? null,
          clinicId: input.clinicId,
          medicalRecordNumber: input.medicalRecordNumber,
          firstName: input.firstName,
          lastName: input.lastName,
          dateOfBirth: new Date(input.dateOfBirth),
          gender: input.gender,
          primaryDoctorId: input.primaryDoctorId ?? null,
          contact: {
            create: {
              phone: input.contact.phone,
              email: input.contact.email ?? null,
              address: input.contact.address,
              city: input.contact.city ?? null,
            },
          },
          emergencyContacts: {
            create:
              input.emergencyContacts?.map((contact) => ({
                fullName: contact.fullName,
                relationship: contact.relationship,
                phone: contact.phone,
              })) ?? [],
          },
        },
        select: patientSelect,
      });

      await this.auditLogService.create({
        actorUserId: user.id,
        action: 'PATIENT_PROFILE_CREATED',
        resourceType: 'PatientProfile',
        resourceId: patient.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return patient;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Patient record number or linked user is already assigned.');
      }
      throw error;
    }
  }

  async getById(id: string, user: AuthenticatedUser, context: RequestContext) {
    const patient = await this.findPatientOrThrow(id);
    await this.assertAccess(user, patient);

    await this.auditLogService.create({
      actorUserId: user.id,
      action: 'PATIENT_PROFILE_VIEWED',
      resourceType: 'PatientProfile',
      resourceId: patient.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { accessMode: this.accessMode(user, patient) },
    });

    return patient;
  }

  async getOwn(user: AuthenticatedUser, context: RequestContext) {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException('Patient profile not found.');
    }

    return this.getById(patient.id, user, context);
  }

  async updateContact(
    id: string,
    input: UpdatePatientContactDto,
    user: AuthenticatedUser,
    context: RequestContext,
  ) {
    assertCanUpdatePatientContact(user);
    const patient = await this.findPatientOrThrow(id);
    await this.clinicAccessService.assertCanAccessClinic(user, patient.clinicId);
    const updateData: Prisma.PatientContactUpdateInput = {};
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.city !== undefined) updateData.city = input.city;

    await this.prisma.patientContact.upsert({
      where: { patientId: id },
      create: {
        patientId: id,
        phone: input.phone ?? '',
        email: input.email ?? null,
        address: input.address ?? '',
        city: input.city ?? null,
      },
      update: updateData,
    });

    await this.auditLogService.create({
      actorUserId: user.id,
      action: 'PATIENT_CONTACT_UPDATED',
      resourceType: 'PatientProfile',
      resourceId: patient.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return this.findPatientOrThrow(id);
  }

  private async assertCreateReferences(input: CreatePatientProfileDto): Promise<void> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: input.clinicId },
      select: { id: true },
    });
    if (!clinic) {
      throw new NotFoundException('Clinic not found.');
    }

    if (input.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      });
      if (!user) {
        throw new NotFoundException('Linked patient user not found.');
      }
    }

    if (input.primaryDoctorId) {
      const doctor = await this.prisma.doctorProfile.findUnique({
        where: { id: input.primaryDoctorId },
        select: { id: true, staffProfile: { select: { clinicId: true } } },
      });
      if (!doctor) {
        throw new NotFoundException('Primary doctor not found.');
      }
      if (doctor.staffProfile.clinicId !== input.clinicId) {
        throw new NotFoundException('Primary doctor not found for clinic.');
      }
    }
  }

  private async findPatientOrThrow(id: string): Promise<PatientWithAccess> {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { id },
      select: patientSelect,
    });
    if (!patient) {
      throw new NotFoundException('Patient profile not found.');
    }

    return patient;
  }

  private async assertAccess(user: AuthenticatedUser, patient: PatientWithAccess): Promise<void> {
    assertCanViewPatient(user, {
      userId: patient.userId,
      primaryDoctorUserId: patient.primaryDoctor?.staffProfile.userId ?? null,
    });
    if (patient.userId !== user.id && patient.primaryDoctor?.staffProfile.userId !== user.id) {
      await this.clinicAccessService.assertCanAccessClinic(user, patient.clinicId);
    }
  }

  private accessMode(user: AuthenticatedUser, patient: PatientWithAccess): string {
    if (patient.userId === user.id) {
      return 'self';
    }
    if (patient.primaryDoctor?.staffProfile.userId === user.id) {
      return 'assigned_doctor';
    }
    return 'authorized_staff';
  }
}
