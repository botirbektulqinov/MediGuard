import type { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';

import { PrismaService } from '../src/prisma/prisma.service';
import { createIntegrationTestApp } from './test-app';

const password = 'DemoPass123!';

async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.auditLog.deleteMany();
  await prisma.securityFinding.deleteMany();
  await prisma.securityIncident.deleteMany();
  await prisma.suspiciousActivityEvent.deleteMany();
  await prisma.suspiciousActivityRule.deleteMany();
  await prisma.releaseGateCheck.deleteMany();
  await prisma.releaseGate.deleteMany();
  await prisma.bugReport.deleteMany();
  await prisma.testRunResult.deleteMany();
  await prisma.testRun.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.testSuite.deleteMany();
  await prisma.loginAttempt.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.fileAttachment.deleteMany();
  await prisma.labResult.deleteMany();
  await prisma.labOrder.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.visitNote.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.queueEntry.deleteMany();
  await prisma.appointmentStatusHistory.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorSchedule.deleteMany();
  await prisma.patientEmergencyContact.deleteMany();
  await prisma.patientContact.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.clinicService.deleteMany();
  await prisma.room.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.clinic.deleteMany();
}

async function seedPatientAccessData(prisma: PrismaService) {
  const passwordHash = await bcrypt.hash(password, 12);
  const permissionKeys = [
    'audit.read',
    'clinic.manage',
    'patient.read',
    'patient.create',
    'patient.update',
    'patient.sensitive.read',
  ];
  const permissions = new Map<string, { id: string }>();

  for (const key of permissionKeys) {
    const permission = await prisma.permission.create({
      data: { key, description: key },
      select: { id: true },
    });
    permissions.set(key, permission);
  }

  async function createRole(name: string, keys: string[]) {
    return prisma.role.create({
      data: {
        name,
        description: name,
        permissions: {
          create: keys.map((key) => {
            const permission = permissions.get(key);
            if (!permission) {
              throw new Error(`Missing permission ${key}`);
            }
            return { permissionId: permission.id };
          }),
        },
      },
      select: { id: true },
    });
  }

  const receptionistRole = await createRole('RECEPTIONIST', [
    'patient.read',
    'patient.create',
    'patient.update',
  ]);
  const clinicAdminRole = await createRole('CLINIC_ADMIN', ['clinic.manage', 'patient.read']);
  const doctorRole = await createRole('DOCTOR', ['patient.read', 'patient.sensitive.read']);
  const patientRole = await createRole('PATIENT', []);
  const securityRole = await createRole('SECURITY_OFFICER', ['audit.read']);

  async function createUser(email: string, roleId: string) {
    const firstName = email.split('@')[0] ?? 'Test';

    return prisma.user.create({
      data: {
        email,
        firstName,
        lastName: 'User',
        passwordHash,
        roles: { create: { roleId } },
      },
      select: { id: true },
    });
  }

  const receptionist = await createUser('reception@demo.com', receptionistRole.id);
  const clinicAdmin = await createUser('clinic.admin@demo.com', clinicAdminRole.id);
  const doctorUser = await createUser('doctor@demo.com', doctorRole.id);
  const patientUser = await createUser('patient@demo.com', patientRole.id);
  const otherPatientUser = await createUser('other.patient@demo.com', patientRole.id);
  await createUser('security@demo.com', securityRole.id);

  const clinic = await prisma.clinic.create({
    data: { name: 'Test Clinic', slug: 'test-clinic' },
    select: { id: true },
  });
  const otherClinic = await prisma.clinic.create({
    data: { name: 'Other Clinic', slug: 'other-clinic' },
    select: { id: true },
  });
  const branch = await prisma.branch.create({
    data: { clinicId: clinic.id, name: 'Main', code: 'MAIN', address: '100 Test Way' },
    select: { id: true },
  });
  const doctorStaff = await prisma.staffProfile.create({
    data: {
      userId: doctorUser.id,
      clinicId: clinic.id,
      branchId: branch.id,
      employeeCode: 'DOC-1',
      jobTitle: 'Doctor',
      department: 'Clinical',
    },
    select: { id: true },
  });
  const doctor = await prisma.doctorProfile.create({
    data: {
      staffProfileId: doctorStaff.id,
      specialty: 'Family Medicine',
      licenseNumber: 'MD-1',
    },
    select: { id: true },
  });

  await prisma.staffProfile.create({
    data: {
      userId: receptionist.id,
      clinicId: clinic.id,
      branchId: branch.id,
      employeeCode: 'REC-1',
      jobTitle: 'Receptionist',
      department: 'Front Desk',
    },
  });
  await prisma.staffProfile.create({
    data: {
      userId: clinicAdmin.id,
      clinicId: clinic.id,
      branchId: branch.id,
      employeeCode: 'ADMIN-1',
      jobTitle: 'Clinic Admin',
      department: 'Administration',
    },
  });

  const assignedPatient = await prisma.patientProfile.create({
    data: {
      userId: patientUser.id,
      clinicId: clinic.id,
      medicalRecordNumber: 'MRN-1',
      firstName: 'Pat',
      lastName: 'Patient',
      dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
      gender: 'UNKNOWN',
      primaryDoctorId: doctor.id,
      medicalNotes: 'This diagnosis note must not leave the API.',
      contact: {
        create: {
          phone: '+1-555-0101',
          email: 'patient@demo.com',
          address: '1 Patient Way',
        },
      },
    },
    select: { id: true },
  });

  const otherPatient = await prisma.patientProfile.create({
    data: {
      userId: otherPatientUser.id,
      clinicId: clinic.id,
      medicalRecordNumber: 'MRN-2',
      firstName: 'Other',
      lastName: 'Patient',
      dateOfBirth: new Date('1985-01-01T00:00:00.000Z'),
      gender: 'UNKNOWN',
      medicalNotes: 'Another sensitive note.',
      contact: {
        create: {
          phone: '+1-555-0102',
          email: 'other.patient@demo.com',
          address: '2 Patient Way',
        },
      },
    },
    select: { id: true },
  });

  const otherClinicPatient = await prisma.patientProfile.create({
    data: {
      clinicId: otherClinic.id,
      medicalRecordNumber: 'MRN-3',
      firstName: 'Cross',
      lastName: 'Clinic',
      dateOfBirth: new Date('1980-01-01T00:00:00.000Z'),
      gender: 'UNKNOWN',
      medicalNotes: 'Cross-clinic sensitive note.',
      contact: {
        create: {
          phone: '+1-555-0103',
          email: 'cross.clinic@demo.com',
          address: '3 Patient Way',
        },
      },
    },
    select: { id: true },
  });

  return { assignedPatient, otherPatient, otherClinicPatient };
}

describe('Patient access integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let assignedPatientId: string;
  let otherPatientId: string;
  let otherClinicPatientId: string;

  beforeAll(async () => {
    app = await createIntegrationTestApp();
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    const seeded = await seedPatientAccessData(prisma);
    assignedPatientId = seeded.assignedPatient.id;
    otherPatientId = seeded.otherPatient.id;
    otherClinicPatientId = seeded.otherClinicPatient.id;
  });

  afterAll(async () => {
    if (prisma) {
      await resetDatabase(prisma);
    }
    if (app) {
      await app.close();
    }
  });

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.accessToken as string;
  }

  it('allows receptionists to search patients without exposing medical notes', async () => {
    const token = await login('reception@demo.com');

    const response = await request(app.getHttpServer())
      .get('/api/patients?search=MRN')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(JSON.stringify(response.body)).not.toContain('medicalNotes');
    expect(JSON.stringify(response.body)).not.toContain('diagnosis');
  });

  it('scopes clinic admin and receptionist access to their assigned clinic', async () => {
    const clinicAdminToken = await login('clinic.admin@demo.com');
    const receptionistToken = await login('reception@demo.com');

    const clinicsResponse = await request(app.getHttpServer())
      .get('/api/clinics')
      .set('Authorization', `Bearer ${clinicAdminToken}`)
      .expect(200);
    expect(clinicsResponse.body).toHaveLength(1);
    expect(clinicsResponse.body[0].slug).toBe('test-clinic');

    await request(app.getHttpServer())
      .post('/api/clinics')
      .set('Authorization', `Bearer ${clinicAdminToken}`)
      .send({ name: 'Unauthorized Clinic', slug: 'unauthorized-clinic' })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/patients/${otherClinicPatientId}/contact`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ phone: '+1-555-0000' })
      .expect(403);
  });

  it('audits receptionist contact updates and keeps medical fields unavailable', async () => {
    const token = await login('reception@demo.com');

    const response = await request(app.getHttpServer())
      .patch(`/api/patients/${assignedPatientId}/contact`)
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+1-555-9999' })
      .expect(200);

    expect(response.body.contact.phone).toBe('+1-555-9999');
    expect(response.body.medicalNotes).toBeUndefined();

    const auditLog = await prisma.auditLog.findFirst({
      where: { action: 'PATIENT_CONTACT_UPDATED', resourceId: assignedPatientId },
    });
    expect(auditLog).toBeTruthy();
  });

  it('prevents a patient from accessing another patient profile', async () => {
    const token = await login('patient@demo.com');

    await request(app.getHttpServer())
      .get('/api/patients/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/patients/${otherPatientId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('allows doctors to view assigned patients but not browse or access unassigned patients', async () => {
    const token = await login('doctor@demo.com');

    await request(app.getHttpServer())
      .get(`/api/patients/${assignedPatientId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/patients/${otherPatientId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/patients')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('allows security officers to read audit logs but not edit patient profiles', async () => {
    const token = await login('security@demo.com');

    await request(app.getHttpServer())
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/patients/${assignedPatientId}/contact`)
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+1-555-0000' })
      .expect(403);
  });
});
