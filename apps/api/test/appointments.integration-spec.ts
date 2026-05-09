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

async function seedAppointmentData(prisma: PrismaService) {
  const passwordHash = await bcrypt.hash(password, 12);
  const permissionKeys = [
    'appointment.read',
    'appointment.create',
    'appointment.update',
    'appointment.cancel',
    'queue.read',
    'queue.manage',
    'reports.read',
    'visit.read',
    'visit.create',
    'visit.update',
    'lab.read',
    'lab.upload',
    'lab.publish',
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
            if (!permission) throw new Error(`Missing permission ${key}`);
            return { permissionId: permission.id };
          }),
        },
      },
      select: { id: true },
    });
  }

  const patientRole = await createRole('PATIENT', [
    'appointment.read',
    'appointment.create',
    'appointment.cancel',
  ]);
  const receptionistRole = await createRole('RECEPTIONIST', [
    'appointment.read',
    'appointment.create',
    'appointment.update',
    'appointment.cancel',
    'queue.read',
    'queue.manage',
  ]);
  const doctorRole = await createRole('DOCTOR', [
    'appointment.read',
    'queue.read',
    'visit.read',
    'visit.create',
    'visit.update',
    'lab.read',
  ]);
  const labRole = await createRole('LAB_TECHNICIAN', ['lab.read', 'lab.upload', 'lab.publish']);
  const clinicAdminRole = await createRole('CLINIC_ADMIN', ['appointment.read', 'reports.read']);

  async function createUser(email: string, roleId: string) {
    return prisma.user.create({
      data: {
        email,
        firstName: email.split('@')[0] ?? 'Test',
        lastName: 'User',
        passwordHash,
        roles: { create: { roleId } },
      },
      select: { id: true },
    });
  }

  const patientUser = await createUser('patient@demo.com', patientRole.id);
  const otherPatientUser = await createUser('other.patient@demo.com', patientRole.id);
  const receptionistUser = await createUser('reception@demo.com', receptionistRole.id);
  const doctorUser = await createUser('doctor@demo.com', doctorRole.id);
  const labUser = await createUser('lab@demo.com', labRole.id);
  await createUser('clinic.admin@demo.com', clinicAdminRole.id);

  const clinic = await prisma.clinic.create({
    data: { name: 'Appointment Clinic', slug: 'appointment-clinic' },
    select: { id: true },
  });
  const branch = await prisma.branch.create({
    data: { clinicId: clinic.id, name: 'Main', code: 'MAIN', address: '100 Appointment Way' },
    select: { id: true },
  });
  const service = await prisma.clinicService.create({
    data: {
      clinicId: clinic.id,
      name: 'Consultation',
      code: 'CONSULT',
      durationMinutes: 30,
      priceCents: 7500,
    },
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
    data: { staffProfileId: doctorStaff.id, specialty: 'Family Medicine', licenseNumber: 'MD-1' },
    select: { id: true },
  });
  await prisma.staffProfile.create({
    data: {
      userId: receptionistUser.id,
      clinicId: clinic.id,
      branchId: branch.id,
      employeeCode: 'REC-1',
      jobTitle: 'Receptionist',
      department: 'Front Desk',
    },
  });
  await prisma.staffProfile.create({
    data: {
      userId: labUser.id,
      clinicId: clinic.id,
      branchId: branch.id,
      employeeCode: 'LAB-1',
      jobTitle: 'Lab Technician',
      department: 'Laboratory',
    },
  });
  await prisma.doctorSchedule.create({
    data: {
      clinicId: clinic.id,
      branchId: branch.id,
      doctorId: doctor.id,
      dayOfWeek: 1,
      startsAt: '09:00',
      endsAt: '17:00',
      slotMinutes: 30,
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    },
  });

  const patient = await prisma.patientProfile.create({
    data: {
      userId: patientUser.id,
      clinicId: clinic.id,
      medicalRecordNumber: 'MRN-1',
      firstName: 'Pat',
      lastName: 'Patient',
      dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
      gender: 'UNKNOWN',
      contact: { create: { phone: '+1-555-0101', address: '1 Patient Way' } },
    },
    select: { id: true },
  });
  await prisma.patientProfile.create({
    data: {
      userId: otherPatientUser.id,
      clinicId: clinic.id,
      medicalRecordNumber: 'MRN-2',
      firstName: 'Other',
      lastName: 'Patient',
      dateOfBirth: new Date('1991-01-01T00:00:00.000Z'),
      gender: 'UNKNOWN',
      contact: { create: { phone: '+1-555-0102', address: '2 Patient Way' } },
    },
  });

  return { branch, doctor, patient, service };
}

describe('Appointment and queue integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let seeded: Awaited<ReturnType<typeof seedAppointmentData>>;

  beforeAll(async () => {
    app = await createIntegrationTestApp();
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    seeded = await seedAppointmentData(prisma);
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

  it('runs patient booking through queue completion with history and audit logs', async () => {
    const patientToken = await login('patient@demo.com');
    const otherPatientToken = await login('other.patient@demo.com');
    const receptionToken = await login('reception@demo.com');
    const doctorToken = await login('doctor@demo.com');
    const labToken = await login('lab@demo.com');

    const booking = await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId: seeded.doctor.id,
        branchId: seeded.branch.id,
        serviceId: seeded.service.id,
        startAt: '2026-05-11T10:00:00.000Z',
        reason: 'Annual checkup',
      })
      .expect(201);

    const appointmentId = booking.body.id as string;
    expect(booking.body.status).toBe('BOOKED');

    await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId: seeded.doctor.id,
        branchId: seeded.branch.id,
        serviceId: seeded.service.id,
        startAt: '2026-05-11T10:00:00.000Z',
      })
      .expect(409);

    await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId: seeded.doctor.id,
        branchId: seeded.branch.id,
        serviceId: seeded.service.id,
        startAt: '2026-05-11T10:15:00.000Z',
      })
      .expect(409);

    await request(app.getHttpServer())
      .patch(`/api/appointments/${appointmentId}/confirm`)
      .set('Authorization', `Bearer ${receptionToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/appointments/${appointmentId}/arrive`)
      .set('Authorization', `Bearer ${receptionToken}`)
      .expect(200);

    const queued = await request(app.getHttpServer())
      .post('/api/queue')
      .set('Authorization', `Bearer ${receptionToken}`)
      .send({ appointmentId })
      .expect(201);
    expect(queued.body.status).toBe('WAITING');

    await request(app.getHttpServer())
      .patch(`/api/queue/${queued.body.id}/lab-required`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/queue/${queued.body.id}/complete`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(400);

    const doctorQueue = await request(app.getHttpServer())
      .get('/api/queue/today')
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(200);
    expect(doctorQueue.body).toHaveLength(1);

    await request(app.getHttpServer())
      .patch(`/api/queue/${queued.body.id}/start`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(200);

    const visit = await request(app.getHttpServer())
      .post('/api/visits')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        appointmentId,
        diagnosisNote: 'Seasonal allergy symptoms',
        recommendation: 'Follow up if symptoms persist',
        prescriptionNote: 'Cetirizine 10mg once daily as needed',
      })
      .expect(201);

    const visitId = visit.body.id as string;
    expect(visit.body.patient.medicalRecordNumber).toBe('MRN-1');

    const withLabOrder = await request(app.getHttpServer())
      .post(`/api/visits/${visitId}/lab-orders`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ testName: 'CBC', instructions: 'Routine blood count' })
      .expect(201);

    const labOrderId = withLabOrder.body.labOrders[0].id as string;

    await request(app.getHttpServer())
      .post(`/api/lab-results/orders/${labOrderId}/upload`)
      .set('Authorization', `Bearer ${labToken}`)
      .field('resultSummary', 'Rejected upload')
      .attach('file', Buffer.from('not allowed'), {
        filename: 'result.exe',
        contentType: 'application/x-msdownload',
      })
      .expect(400);

    const labOrderAfterRejectedUpload = await prisma.labOrder.findUniqueOrThrow({
      where: { id: labOrderId },
      include: { result: true },
    });
    expect(labOrderAfterRejectedUpload.result).toBeNull();
    expect(labOrderAfterRejectedUpload.status).toBe('ORDERED');

    const uploaded = await request(app.getHttpServer())
      .post(`/api/lab-results/orders/${labOrderId}/upload`)
      .set('Authorization', `Bearer ${labToken}`)
      .field('resultSummary', 'CBC values are inside expected range.')
      .attach('file', Buffer.from('%PDF-1.4\nLab result\n'), {
        filename: 'result.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const labResultId = uploaded.body.id as string;
    const attachmentId = uploaded.body.attachment.id as string;

    await request(app.getHttpServer())
      .patch(`/api/lab-results/${labResultId}/ready`)
      .set('Authorization', `Bearer ${labToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/patient-portal/lab-results/${labResultId}`)
      .set('Authorization', `Bearer ${otherPatientToken}`)
      .expect(403);

    const patientResults = await request(app.getHttpServer())
      .get('/api/patient-portal/lab-results')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);
    expect(patientResults.body).toHaveLength(1);

    await request(app.getHttpServer())
      .get(`/api/files/${attachmentId}/download`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    const draftPortalVisits = await request(app.getHttpServer())
      .get('/api/patient-portal/visits')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);
    expect(draftPortalVisits.body).toHaveLength(0);

    await request(app.getHttpServer())
      .patch(`/api/visits/${visitId}/complete`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(200);

    const portalVisits = await request(app.getHttpServer())
      .get('/api/patient-portal/visits')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);
    expect(portalVisits.body).toHaveLength(1);

    const completed = await request(app.getHttpServer())
      .patch(`/api/queue/${queued.body.id}/complete`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(200);
    expect(completed.body.status).toBe('COMPLETED');

    const appointment = await prisma.appointment.findUniqueOrThrow({
      where: { id: appointmentId },
      include: { statusHistory: true },
    });
    expect(appointment.status).toBe('COMPLETED');
    expect(appointment.statusHistory.map((item) => item.toStatus)).toEqual([
      'BOOKED',
      'CONFIRMED',
      'ARRIVED',
      'IN_QUEUE',
      'IN_CONSULTATION',
      'COMPLETED',
    ]);

    const statusAudits = await prisma.auditLog.count({
      where: { action: 'APPOINTMENT_STATUS_CHANGED', resourceId: appointmentId },
    });
    expect(statusAudits).toBeGreaterThanOrEqual(6);

    const medicalAudits = await prisma.auditLog.count({
      where: { resourceType: 'MedicalRecord' },
    });
    expect(medicalAudits).toBeGreaterThanOrEqual(5);
  });

  it('rejects unauthorized appointment access and appointments outside schedule', async () => {
    const patientToken = await login('patient@demo.com');
    const otherPatientToken = await login('other.patient@demo.com');

    const booking = await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId: seeded.doctor.id,
        branchId: seeded.branch.id,
        serviceId: seeded.service.id,
        startAt: '2026-05-11T11:00:00.000Z',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/appointments/${booking.body.id}`)
      .set('Authorization', `Bearer ${otherPatientToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/appointments?from=not-a-date')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId: seeded.doctor.id,
        branchId: seeded.branch.id,
        serviceId: seeded.service.id,
        startAt: '2026-05-11T18:00:00.000Z',
      })
      .expect(409);
  });
});
