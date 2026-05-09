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

async function seedReportData(prisma: PrismaService): Promise<void> {
  const passwordHash = await bcrypt.hash(password, 12);
  const permissionKeys = [
    'reports.read',
    'clinic.manage',
    'appointment.read',
    'queue.manage',
    'queue.read',
    'qa.read',
    'security.read',
    'auth.me',
  ];
  const permissions = new Map<string, { id: string }>();
  for (const key of permissionKeys) {
    permissions.set(
      key,
      await prisma.permission.create({ data: { key, description: key }, select: { id: true } }),
    );
  }

  async function role(name: string, keys: string[]) {
    return prisma.role.create({
      data: {
        name,
        description: name,
        permissions: {
          create: keys.map((key) => ({ permissionId: permissions.get(key)?.id ?? '' })),
        },
      },
      select: { id: true },
    });
  }

  const clinicAdminRole = await role('CLINIC_ADMIN', ['reports.read', 'clinic.manage']);
  const receptionRole = await role('RECEPTIONIST', ['appointment.read', 'queue.manage']);
  const doctorRole = await role('DOCTOR', ['queue.read']);
  const qaRole = await role('QA_MANAGER', ['qa.read', 'reports.read']);
  const securityRole = await role('SECURITY_OFFICER', ['security.read', 'reports.read']);
  const patientRole = await role('PATIENT', ['auth.me']);

  async function user(email: string, roleId: string) {
    return prisma.user.create({
      data: {
        email,
        firstName: email.split('@')[0] ?? 'Demo',
        lastName: 'User',
        passwordHash,
        roles: { create: { roleId } },
      },
      select: { id: true },
    });
  }

  const clinicAdmin = await user('clinic.admin@demo.com', clinicAdminRole.id);
  const reception = await user('reception@demo.com', receptionRole.id);
  const doctorUser = await user('doctor@demo.com', doctorRole.id);
  await user('qa@demo.com', qaRole.id);
  await user('security@demo.com', securityRole.id);
  const patientUser = await user('patient@demo.com', patientRole.id);

  const clinic = await prisma.clinic.create({
    data: { name: 'Reports Clinic', slug: 'reports-clinic' },
    select: { id: true },
  });
  const branch = await prisma.branch.create({
    data: { clinicId: clinic.id, name: 'Main', code: 'MAIN', address: '1 Reports Way' },
    select: { id: true },
  });
  const doctorStaff = await prisma.staffProfile.create({
    data: {
      userId: doctorUser.id,
      clinicId: clinic.id,
      branchId: branch.id,
      employeeCode: 'DOC-RPT',
      jobTitle: 'Doctor',
      department: 'Clinical',
    },
    select: { id: true },
  });
  await prisma.staffProfile.create({
    data: {
      userId: clinicAdmin.id,
      clinicId: clinic.id,
      branchId: branch.id,
      employeeCode: 'ADM-RPT',
      jobTitle: 'Admin',
      department: 'Operations',
    },
  });
  await prisma.staffProfile.create({
    data: {
      userId: reception.id,
      clinicId: clinic.id,
      branchId: branch.id,
      employeeCode: 'REC-RPT',
      jobTitle: 'Receptionist',
      department: 'Front Desk',
    },
  });
  const doctor = await prisma.doctorProfile.create({
    data: { staffProfileId: doctorStaff.id, specialty: 'Family Medicine', licenseNumber: 'MD-RPT' },
    select: { id: true },
  });
  const patient = await prisma.patientProfile.create({
    data: {
      userId: patientUser.id,
      clinicId: clinic.id,
      medicalRecordNumber: 'MRN-RPT',
      firstName: 'Pat',
      lastName: 'Patient',
      dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
      gender: 'UNKNOWN',
    },
    select: { id: true },
  });
  const appointment = await prisma.appointment.create({
    data: {
      clinicId: clinic.id,
      branchId: branch.id,
      patientId: patient.id,
      doctorId: doctor.id,
      startAt: new Date(Date.now() + 60 * 60 * 1000),
      endAt: new Date(Date.now() + 90 * 60 * 1000),
      status: 'CONFIRMED',
      createdByUserId: reception.id,
    },
    select: { id: true },
  });
  await prisma.queueEntry.create({
    data: {
      clinicId: clinic.id,
      branchId: branch.id,
      appointmentId: appointment.id,
      patientId: patient.id,
      doctorId: doctor.id,
      status: 'WAITING',
      position: 1,
    },
  });

  const suite = await prisma.testSuite.create({
    data: { name: 'Reports QA', featureArea: 'Dashboards' },
    select: { id: true },
  });
  const testCase = await prisma.testCase.create({
    data: {
      suiteId: suite.id,
      title: 'Dashboard loads',
      featureArea: 'Dashboards',
      steps: 'Open dashboard',
      expectedResult: 'Dashboard metrics are visible',
      isRequired: true,
    },
    select: { id: true },
  });
  const run = await prisma.testRun.create({
    data: { suiteId: suite.id, name: 'Reports run' },
    select: { id: true },
  });
  const result = await prisma.testRunResult.create({
    data: { testRunId: run.id, testCaseId: testCase.id, status: 'FAILED' },
    select: { id: true },
  });
  await prisma.bugReport.create({
    data: {
      testRunResultId: result.id,
      title: 'Dashboard metric mismatch',
      description: 'Expected seeded metric.',
      severity: 'HIGH',
      featureArea: 'Dashboards',
    },
  });
  await prisma.securityIncident.create({
    data: {
      title: 'Failed login burst',
      description: 'Repeated failed login attempts.',
      severity: 'HIGH',
    },
  });
  await prisma.loginAttempt.create({
    data: { email: 'missing@demo.com', success: false, failureReason: 'INVALID_CREDENTIALS' },
  });
}

describe('Reports integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createIntegrationTestApp();
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    await seedReportData(prisma);
  });

  afterAll(async () => {
    if (prisma) await resetDatabase(prisma);
    if (app) await app.close();
  });

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    return response.body.accessToken as string;
  }

  it('returns report analytics for authorized users and rejects patient access', async () => {
    const clinicAdminToken = await login('clinic.admin@demo.com');
    const qaToken = await login('qa@demo.com');
    const securityToken = await login('security@demo.com');
    const patientToken = await login('patient@demo.com');

    await request(app.getHttpServer())
      .get('/api/reports/appointments-per-day')
      .set('Authorization', `Bearer ${clinicAdminToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/reports/open-bugs-by-severity')
      .set('Authorization', `Bearer ${clinicAdminToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/reports/open-bugs-by-severity')
      .set('Authorization', `Bearer ${qaToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/reports/security-incidents-by-severity')
      .set('Authorization', `Bearer ${securityToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/reports/failed-login-trends')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(403);
  });

  it('returns role dashboard summaries', async () => {
    const roles = [
      ['clinic.admin@demo.com', 'clinic-admin'],
      ['reception@demo.com', 'reception'],
      ['doctor@demo.com', 'doctor'],
      ['qa@demo.com', 'qa'],
      ['security@demo.com', 'security'],
      ['patient@demo.com', 'patient'],
    ] as const;

    for (const [email, dashboard] of roles) {
      const token = await login(email);
      const response = await request(app.getHttpServer())
        .get(`/api/dashboards/${dashboard}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.metrics).toBeDefined();
    }
  });
});
